"""Request and response models for dealing with error recovery policies."""
from enum import Enum
from pydantic import BaseModel, Field


class ReactionIfMatch(Enum):
    """The type of the error recovery setting.

    * `"ignoreAndContinue"`: Ignore this error and future errors of the same type.
    * `"failRun"`: Errors of this type should fail the run.
    * `"waitForRecovery"`: Instances of this error should initiate a recover operation.

    """

    IGNORE_AND_CONTINUE = "ignoreAndContinue"
    FAIL_RUN = "failRun"
    WAIT_FOR_RECOVERY = "waitForRecovery"


# There's a lot of nested classes here. This is the JSON schema this code models.
# "ErrorRecoveryRule": {
#     "matchCriteria": {
#         "command": {
#             "commandType": "foo",
#             "error": {
#                 "errorType": "bar"
#             }
#         }
#     },
#     "ifMatch": "baz"
# }


class ErrorMatcher(BaseModel):
    """The error type that this rule applies to."""

    errorType: str = Field(..., description="The error type that this rule applies to.")


class CommandMatcher(BaseModel):
    """Command/error data used for matching rules."""

    commandType: str = Field(
        ..., description="The command type that this rule applies to."
    )
    error: ErrorMatcher = Field(
        ..., description="The error details that this rule applies to."
    )


class MatchCriteria(BaseModel):
    """The criteria that this rule will attempt to match."""

    command: CommandMatcher = Field(
        ..., description="The command and error types that this rule applies to."
    )


class ErrorRecoveryRule(BaseModel):
    """Request/Response model for new error recovery rule creation."""

    matchCriteria: list[MatchCriteria] = Field(
        default_factory=list,
        description="The criteria that must be met for this rule to be applied.",
    )
    ifMatch: list[ReactionIfMatch] = Field(
        default_factory=list,
        description="The specific recovery setting that will be in use if the type parameters match.",
    )
