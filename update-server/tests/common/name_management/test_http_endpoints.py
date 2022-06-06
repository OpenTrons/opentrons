async def test_get_name(test_cli, mock_name_synchronizer, decoy) -> None:
    decoy.when(mock_name_synchronizer.get_name()).then_return("the returned name")

    response = await (test_cli[0].get("/server/name"))
    assert response.status == 200

    body = await response.json()
    assert body["name"] == "the returned name"


async def test_set_name_valid(test_cli, mock_name_synchronizer, decoy) -> None:
    decoy.when(await mock_name_synchronizer.set_name("the input name")).then_return(
        "the returned name"
    )

    response = await test_cli[0].post("/server/name", json={"name": "the input name"})
    assert response.status == 200

    body = await response.json()
    assert body["name"] == "the returned name"


async def test_set_name_not_json(test_cli) -> None:
    response = await test_cli[0].post("/server/name", data="bada bing bada boom")
    assert response.status == 400


async def test_set_name_field_missing(test_cli) -> None:
    response = await test_cli[0].post("/server/name", json={})
    assert response.status == 400


async def test_set_name_field_not_a_str(test_cli) -> None:
    response = await test_cli[0].post("/server/name", json={"name": 2})
    assert response.status == 400
