# Supabase Power BI Implementation

Huong dan nay danh cho truong hop ban da ket noi Power BI Desktop toi Supabase PostgreSQL thanh cong. Muc tieu la dung cac view trong schema `mart` lam nguon dashboard chinh, giu OLTP `public` chi la nguon van hanh va ETL.

## 1. Import Tables In Power BI

Trong Power BI Desktop:

1. Chon `Get data` -> `PostgreSQL database`.
2. Nhap host, database, port va credential Supabase/PostgreSQL.
3. Chon `Import` mode cho dashboard demo.
4. Trong Navigator, chon cac view sau trong schema `mart`:

| Supabase view | Rename query to |
| --- | --- |
| `mart.vw_system_kpi_overview` | `KPI Overview` |
| `mart.vw_encounter_by_month_hospital` | `Encounter By Month Hospital` |
| `mart.vw_top_disease` | `Top Disease` |
| `mart.vw_encounter_by_doctor_specialty` | `Encounter By Doctor Specialty` |
| `mart.vw_prescription_by_month_drug` | `Prescription By Month Drug` |
| `mart.vw_appointment_status` | `Appointment Status` |
| `mart.vw_consent_status` | `Consent Status` |
| `mart.vw_patient_mapping_by_hospital` | `Patient Mapping By Hospital` |

Khong import truc tiep cac bang OLTP trong schema `public` cho dashboard nay. Neu can drill-down sau nay, import them cac bang `dwh.dim_*` va `dwh.fact_*`, khong dung `public.*`.

## 2. Power Query Cleanup

Trong `Transform data`:

1. Doi ten query theo cot `Rename query to` o bang tren.
2. Dat data type:
   - `year_number`, `month_number`: Whole number.
   - Cac cot bat dau bang `total_`, `encounters_`, `prescription_lines`: Whole number hoac Decimal number tuy Power BI nhan dien.
   - `avg_duration_days`, `avg_valid_duration_days`: Decimal number.
   - `refreshed_at`: Date/Time.
3. Khong doi ten cot snake_case neu muon copy DAX trong `assets/powerbi-measures-supabase.dax` truc tiep.
4. An cac cot ky thuat khong can hien thi neu co, nhung khong xoa cot aggregate can cho measure.

## 3. Calculated Columns

Tao calculated columns de sort thang dung thu tu.

Trong `Encounter By Month Hospital`:

```DAX
month_sort = 'Encounter By Month Hospital'[year_number] * 100 + 'Encounter By Month Hospital'[month_number]
month_label = FORMAT(DATE('Encounter By Month Hospital'[year_number], 'Encounter By Month Hospital'[month_number], 1), "yyyy-MM")
```

Trong `Prescription By Month Drug`:

```DAX
month_sort = 'Prescription By Month Drug'[year_number] * 100 + 'Prescription By Month Drug'[month_number]
month_label = FORMAT(DATE('Prescription By Month Drug'[year_number], 'Prescription By Month Drug'[month_number], 1), "yyyy-MM")
```

Trong `Appointment Status`:

```DAX
month_sort = 'Appointment Status'[year_number] * 100 + 'Appointment Status'[month_number]
month_label = FORMAT(DATE('Appointment Status'[year_number], 'Appointment Status'[month_number], 1), "yyyy-MM")
```

Sau do chon cot `month_label`, dung `Sort by column` -> `month_sort`.

## 4. Measures

Copy cac measure trong:

```text
docs/06-bi-powerbi/assets/powerbi-measures-supabase.dax
```

Nen tao mot table rong trong Power BI ten `Measures` de gom measure:

```DAX
Measures = DATATABLE("Name", STRING, {{"Measures"}})
```

Tao cac measure trong table nay de report de quan ly hon.

## 5. Report Pages

Dung checklist chi tiet tai:

```text
docs/06-bi-powerbi/page-build-checklist.md
```

Thu tu dung report:

1. Executive Overview.
2. Encounter Trends.
3. Disease Analytics.
4. Prescription Analytics.
5. Appointment And Consent Operations.
6. HIS / MPI Coverage.

Neu can lam nhanh de demo, uu tien page 1, 2 va 6 vi cac page nay chung minh tong quan he thong va lien thong HIS ro nhat.

## 6. Supabase Refresh Flow

Truoc khi bam `Refresh` trong Power BI Desktop:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Sau do trong Power BI Desktop:

1. Bam `Refresh`.
2. Mo page Executive Overview.
3. So sanh KPI cards voi query trong `assets/supabase-validation.sql`.

## 7. Validation In Supabase SQL Editor

Mo Supabase Dashboard -> SQL Editor, chay file:

```text
docs/06-bi-powerbi/assets/supabase-validation.sql
```

Ket qua mong doi:

- Tat ca mart views co count > 0 sau khi ETL co du lieu.
- KPI tu `mart.vw_system_kpi_overview` khop voi cac bang `dwh.fact_*`.
- Dashboard khong can bat ky field dinh danh truc tiep nao nhu `identity_number`, `insurance_code`, hoac `local_patient_id`.

## 8. Publish Notes

Neu publish len Power BI Service:

- Khong publish credential vao repo.
- Dung credential Supabase rieng cho reporting neu co the.
- Cau hinh scheduled refresh chi sau khi Desktop refresh on dinh.
- Neu Supabase yeu cau SSL, giu cau hinh encryption/SSL trong connector PostgreSQL cua Power BI.
- Khong bat export data chi tiet cho visuals co kha nang lo du lieu cap dong.

## 9. Done Criteria

Dashboard duoc xem la trien khai xong khi:

- 8 mart views da import vao Power BI Desktop.
- Measures trong `powerbi-measures-supabase.dax` da tao.
- 6 page trong checklist da co visual chinh.
- Validation SQL khop voi KPI cards.
- Report khong hien thi direct patient identifiers.
