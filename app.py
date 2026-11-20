import math
import pandas as pd
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)


def serie_depuis_json(payload):
    """{"donnees": [{"date": ..., "valeur": ...}]} -> Series pandas triée par date."""
    donnees = payload.get("donnees") if payload else None
    if not donnees or len(donnees) < 3:
        raise ValueError("Il faut au moins 3 observations.")
    df = pd.DataFrame(donnees)
    df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d")
    df["valeur"] = pd.to_numeric(df["valeur"])
    return df.sort_values("date").set_index("date")["valeur"]


def liste(valeurs):
    """NaN n'existe pas en JSON : on le remplace par None, qui devient null."""
    return [None if math.isnan(v) else round(float(v), 3) for v in valeurs]


@app.route("/")
def index():
    return render_template("index.html")


# Partie B : la route POST /api/analyse
@app.post("/api/analyse")
def analyse():
    try:
        y = serie_depuis_json(request.get_json(silent=True))
    except (ValueError, KeyError, TypeError) as e:
        return jsonify({"erreur": str(e)}), 400

    mm3 = y.rolling(window=3).mean()
    return jsonify({
        "dates": [d.strftime("%Y-%m-%d") for d in y.index],
        "valeurs": liste(y.values),
        "moyenne_mobile": liste(mm3.values),
    })


if __name__ == "__main__":
    app.run(debug=True)