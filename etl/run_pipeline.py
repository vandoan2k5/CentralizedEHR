from etl.extract import extract_all
from etl.transform import transform_all
from etl.load import load_all


def run_pipeline():
    print("=== CentralizedEHR ETL START ===")
    print("Step 1/3: Extract from public OLTP")
    raw = extract_all()

    print("Step 2/3: Transform and standardize")
    clean = transform_all(raw)

    print("Step 3/3: Load to dwh")
    load_all(clean)

    print("=== CentralizedEHR ETL COMPLETED ===")


if __name__ == "__main__":
    run_pipeline()
