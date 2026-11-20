from app import app
client = app.test_client()
quatre_mois = [{"date": f"2020-0{m}-01", "valeur": v}
               for m, v in zip(range(1, 5), [110.6, 112.9, 122.2, 120.1])]

r = client.post("/api/analyse", json={"donnees": quatre_mois})
assert r.status_code == 200
assert r.get_json()["moyenne_mobile"] == [None, None, 115.233, 118.4]

r = client.post("/api/analyse", json={"donnees": quatre_mois[::-1]})
assert r.get_json()["dates"][0] == "2020-01-01"          # tri par date

r = client.post("/api/analyse", json={"donnees": quatre_mois[:2]})
assert r.status_code == 400                               # trop court

r = client.post("/api/analyse", json={"donnees": [{"date": "2020-13-01", "valeur": 98}] + quatre_mois[1:]})
assert r.status_code == 400 and "erreur" in r.get_json()  # date invalide
print("Tous les tests passent.")