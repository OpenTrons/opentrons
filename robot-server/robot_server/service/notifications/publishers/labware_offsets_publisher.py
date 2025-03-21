from typing import Annotated
import fastapi
from robot_server.service.notifications import topics
from robot_server.service.notifications.notification_client import (
    NotificationClient,
    get_notification_client,
)


class LabwareOffsetsPublisher:
    """Publishes clientData topics."""

    def __init__(self, client: NotificationClient) -> None:
        self._client = client

    def publish_labware_offsets(self) -> None:
        """Publish the equivalent of `GET /labwareOffsets` or `POST /labwareOffsets/searches`."""
        self._client.publish_advise_refetch(topics.LABWARE_OFFSETS)


async def get_labware_offsets_publisher(
    notification_client: Annotated[
        NotificationClient, fastapi.Depends(get_notification_client)
    ],
) -> LabwareOffsetsPublisher:
    """Return a ClientDataPublisher for use by FastAPI endpoints."""
    return LabwareOffsetsPublisher(notification_client)
