import uuid
from pathlib import Path
from typing import Any, Dict, List, Literal, cast

import requests
import structlog
import weave  # type: ignore
from anthropic import Anthropic
from anthropic.types import Message, MessageParam
from ddtrace import tracer

from api.domain.config_anthropic import DOCUMENTS, PROMPT, PROMPT_RELEVANT_API, SYSTEM_PROMPT
from api.settings import Settings

weave.init("opentronsai/OpentronsAI-Phase-march-25")
settings: Settings = Settings()
logger = structlog.stdlib.get_logger(settings.logger_name)
ROOT_PATH: Path = Path(Path(__file__)).parent.parent.parent


class AnthropicPredict:
    def __init__(self, settings: Settings) -> None:
        self.settings: Settings = settings
        self.client: Anthropic = Anthropic(api_key=settings.anthropic_api_key.get_secret_value())
        self.model_name: str = settings.anthropic_model_name
        self.model_helper: str = settings.model_helper
        self.system_prompt: str = SYSTEM_PROMPT
        self.path_docs: Path = ROOT_PATH / "api" / "storage" / "docs"
        self.path_api_docs: Path = ROOT_PATH / "api" / "storage" / "api_docs" / "v2_structure.xml"
        self.cached_docs: List[MessageParam] = cast(
            List[MessageParam],
            [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": DOCUMENTS.format(doc_content=self.get_docs()), "cache_control": {"type": "ephemeral"}}
                    ],
                }
            ],
        )
        self.cached_api_docs: List[MessageParam] = cast(
            List[MessageParam],
            [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": self.get_api_docs(), "cache_control": {"type": "ephemeral"}}],
                }
            ],
        )
        self.tools: List[Dict[str, Any]] = [
            {
                "name": "simulate_protocol",
                "description": "Simulates the python protocol on user input. Returned value is text indicating if protocol is successful.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "protocol": {"type": "string", "description": "protocol in python for simulation"},
                    },
                    "required": ["protocol"],
                },
            }
        ]

    @tracer.wrap()
    def get_docs(self) -> str:
        """
        Processes documents from a directory and returns their content wrapped in XML tags.
        Each document is wrapped in <document> tags with metadata subtags.

        Returns:
            str: XML-formatted string containing all documents and their metadata
        """
        logger.info("Getting docs", extra={"path": str(self.path_docs)})
        xml_output = ["<documents>"]
        for file_path in self.path_docs.iterdir():
            try:
                content = file_path.read_text(encoding="utf-8")
                document_xml = [
                    "<document>",
                    f"  <source>{file_path.name}</source>",
                    "   <document_content>",
                    f"    {content}",
                    "   </document_content>",
                    "</document>",
                ]
                xml_output.extend(document_xml)

            except Exception as e:
                logger.error("Error procesing file", extra={"file": file_path.name, "error": str(e)})
                continue

        xml_output.append("</documents>")
        return "\n".join(xml_output)

    @tracer.wrap()
    def get_api_docs(self) -> str:
        """
        Read Python API v2 docs and return as string
        """
        logger.info("Getting Python API v2 docs", extra={"path": str(self.path_api_docs)})
        with open(self.path_api_docs, "r") as f:
            v2_doc_content = f.read()
        return f"<python_v2_api_doc>\n{v2_doc_content}\n</python_v2_api_doc>"

    @tracer.wrap()
    def get_relevant_api_docs(self, query: str, user_id: str) -> str:
        """
        Get relevant API docs based on the user's prompt
        """
        msg = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "text", "media_type": "text/plain", "data": self.get_api_docs()},
                        "title": "Python API V2 Documentation",
                        "context": "This is an Official Python API V2 Documentation for Opentrons robots.",
                        "cache_control": {"type": "ephemeral"},
                    },
                    {"type": "text", "text": PROMPT_RELEVANT_API.format(API_QUERY=query)},
                ],
            }
        ]

        response = self.client.messages.create(  # type: ignore[call-overload]
            max_tokens=2048,
            temperature=0.0,
            messages=msg,
            model=self.model_helper,
            system="""You are a helpful assistant to collect relevant information to the query. You find information
                given in tags <python_v2_api_doc>.
            """,
            metadata={"user_id": user_id},
        )
        return response.content[0].text  # type: ignore[no-any-return]

    @tracer.wrap()
    def _process_message(
        self, user_id: str, messages: List[MessageParam], message_type: Literal["create", "update"], max_tokens: int = 4096
    ) -> Message:
        """
        Internal method to handle message processing with different system prompts.
        For now, system prompt is the same.
        """

        response: Message = self.client.messages.create(  # type: ignore[call-overload]
            max_tokens=max_tokens,
            messages=messages,
            model=self.model_name,
            system=self.system_prompt,
            tools=self.tools,
            metadata={"user_id": user_id},
            temperature=0.0,
        )

        logger.info(
            f"Token usage: {message_type.capitalize()}",
            extra={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "cache_read": getattr(response.usage, "cache_read_input_tokens", "---"),
                "cache_create": getattr(response.usage, "cache_creation_input_tokens", "---"),
            },
        )
        return response

    @tracer.wrap()
    def process_message(
        self, user_id: str, prompt: str, history: List[MessageParam] | None = None, message_type: Literal["create", "update"] = "create"
    ) -> str | None:
        """Unified method for creating and updating messages"""
        try:
            messages: List[MessageParam] = self.cached_docs.copy()
            if history:
                messages += history

            if len(messages) == 1:
                relevant_api_docs = self.get_relevant_api_docs(prompt, user_id)
                prompt = f"{prompt}\n\n{relevant_api_docs}"

            messages.append({"role": "user", "content": PROMPT.format(USER_PROMPT=prompt)})
            response = self._process_message(user_id=user_id, messages=messages, message_type=message_type)

            if response.content[-1].type == "tool_use":
                tool_use = response.content[-1]
                messages.append({"role": "assistant", "content": response.content})
                result = self.handle_tool_use(tool_use.name, tool_use.input)  # type: ignore[arg-type]
                messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": result,
                            }
                        ],
                    }
                )
                follow_up = self._process_message(user_id=user_id, messages=messages, message_type=message_type)
                if follow_up.content and follow_up.content[0].type == "text":
                    # Simply return the text directly
                    return follow_up.content[0].text
                logger.error("Unexpected follow-up response type")
                return None

            elif response.content and response.content[0].type == "text":
                # Simply return the text directly
                return response.content[0].text

            logger.error("Unexpected response type")
            return None
        except Exception as e:
            logger.error(f"Error in {message_type} method", extra={"error": str(e)})
            return None

    @tracer.wrap()
    def create(self, user_id: str, prompt: str, history: List[MessageParam] | None = None) -> str | None:
        return self.process_message(user_id, prompt, history, "create")

    @tracer.wrap()
    def update(self, user_id: str, prompt: str, history: List[MessageParam] | None = None) -> str | None:
        return self.process_message(user_id, prompt, history, "update")

    @tracer.wrap()
    def handle_tool_use(self, func_name: str, func_params: Dict[str, Any]) -> str:
        if func_name == "simulate_protocol":
            results = self.simulate_protocol(**func_params)
            return results

        logger.error("Unknown tool", extra={"tool": func_name})
        raise ValueError(f"Unknown tool: {func_name}")

    @tracer.wrap()
    def simulate_protocol(self, protocol: str) -> str:
        url = "https://Opentrons-simulator.hf.space/protocol"
        protocol_name = str(uuid.uuid4()) + ".py"
        data = {"name": protocol_name, "content": protocol}
        hf_token: str = settings.huggingface_api_key.get_secret_value()
        headers = {"Content-Type": "application/json", "Authorization": "Bearer {}".format(hf_token)}
        response = requests.post(url, json=data, headers=headers)

        if response.status_code != 200:
            logger.error("Simulation request failed", extra={"status": response.status_code, "error": response.text})
            return f"Error: {response.text}"

        response_data = response.json()
        if "error_message" in response_data:
            logger.error("Simulation error", extra={"error": response_data["error_message"]})
            return str(response_data["error_message"])
        elif "protocol_name" in response_data:
            return str(response_data["run_status"])
        else:
            logger.error("Unexpected response", extra={"response": response_data})
            return "Unexpected response"


def main() -> None:
    """Intended for testing this class locally."""
    import sys
    from pathlib import Path

    # # Add project root to Python path
    root_dir = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(root_dir))

    from rich import print
    from rich.prompt import Prompt

    settings = Settings()
    llm = AnthropicPredict(settings)
    Prompt.ask("Type a prompt to send to the Anthropic API:")

    completion = llm.create(user_id="1", prompt="hi", history=None)
    print(completion)


if __name__ == "__main__":
    main()
