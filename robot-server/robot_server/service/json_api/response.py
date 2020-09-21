from typing import Generic, TypeVar, Optional, List
from pydantic import Field
from pydantic.generics import GenericModel

from .resource_links import ResourceLinks


AttributesT = TypeVar('AttributesT')


class ResponseDataModel(GenericModel, Generic[AttributesT]):
    """
    """
    id: Optional[str] = \
        Field(None,
              description="id member represents a resource object.")
    type: Optional[str] = \
        Field(None,
              description="type member is used to describe resource objects"
                          " that share common attributes.")
    attributes: AttributesT = \
        Field({},
              description="an attributes object representing some of the"
                          " resource’s data.")

    # Note(isk: 3/13/20): Need this to validate attribute default
    # see here: https://pydantic-docs.helpmanual.io/usage/model_config/
    class Config:
        validate_all = True

    @classmethod
    def create(cls, attributes: AttributesT, resource_id: str):
        return ResponseDataModel[AttributesT](
            id=resource_id,
            attributes=attributes,
            type=attributes.__class__.__name__)


DESCRIPTION_DATA = "the document’s 'primary data'"

DESCRIPTION_LINKS = "a links object related to the primary data."

DESCRIPTION_META = "a meta object that contains non-standard" \
                             " meta-information."

MetaT = TypeVar('MetaT')


class ResponseModel(GenericModel, Generic[AttributesT, MetaT]):
    """A response that returns a single resource"""

    meta: Optional[MetaT] = Field(None, description=DESCRIPTION_META)
    links: Optional[ResourceLinks] = Field(None, description=DESCRIPTION_LINKS)
    data: ResponseDataModel[AttributesT] = Field(
        ...,
        description=DESCRIPTION_DATA
    )


class MultiResponseModel(GenericModel, Generic[AttributesT, MetaT]):
    """A response that returns multiple resources"""

    meta: Optional[MetaT] = Field(None, description=DESCRIPTION_META)
    links: Optional[ResourceLinks] = Field(None, description=DESCRIPTION_LINKS)
    data: List[ResponseDataModel[AttributesT]] = Field(
        ...,
        description=DESCRIPTION_DATA
    )
