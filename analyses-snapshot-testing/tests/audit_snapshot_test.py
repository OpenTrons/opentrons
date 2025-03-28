from tests.audit_snapshots import audit_snapshots


def test_audit_snapshots() -> None:
    result = audit_snapshots()
    assert len(result.files_with_unexpected_errors) == 0
    assert len(result.files_missing_expected_errors) == 0
