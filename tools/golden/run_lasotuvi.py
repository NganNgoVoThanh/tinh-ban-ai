"""Chạy lasotuvi trên cùng ngày âm và giờ mà bộ tính đã dùng, ghi fixtures/lasotuvi.json.

Đưa ngày âm (không đưa ngày dương) để tách phần an sao khỏi phần đổi lịch.
Fixture được commit để golden test chạy trên mọi commit mà không cần Python; chỉ giữ các sao
đem so (COMPARED, khớp COMPARED_STARS trong lib.ts) và ghi kèm đầu vào để test phát hiện khi
bộ tính đổi ngày âm hay giờ (khi đó chạy lại script này).
Chạy: .venv/Scripts/python -I run_lasotuvi.py
"""
import json
import pathlib
import unicodedata

from lasotuvi import Sao
from lasotuvi.App import lapDiaBan
from lasotuvi.DiaBan import diaBan

HERE = pathlib.Path(__file__).resolve().parent
CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"]
PALACE_ALIAS = {"tu_tuc": "tu_nu"}
# Tên sao theo iztro, để so cùng key với bộ tính.
STAR_ALIAS = {"thien_rieu": "thien_dieu"}
BRIGHTNESS = {"M": "mieu", "V": "vuong", "Đ": "dac", "B": "binh", "H": "ham"}
HOA = {"hoa_loc": "loc", "hoa_quyen": "quyen", "hoa_khoa": "khoa", "hoa_ky": "ky"}
COMPARED = [
    "tu_vi", "liem_trinh", "thien_dong", "vu_khuc", "thai_duong", "thien_co", "thien_phu", "thai_am",
    "tham_lang", "cu_mon", "thien_tuong", "thien_luong", "that_sat", "pha_quan",
    "ta_phu", "huu_bat", "van_xuong", "van_khuc", "thien_khoi", "thien_viet", "loc_ton", "kinh_duong",
    "da_la", "hoa_tinh", "linh_tinh", "dia_khong", "dia_kiep", "thien_ma",
    "thien_khoc", "thien_hu", "thien_hinh", "thien_dieu",
]


def slug(name):
    s = unicodedata.normalize("NFD", name)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.replace("đ", "d").replace("Đ", "D").lower().strip()
    out, prev_us = [], False
    for ch in s:
        if ch.isalnum():
            out.append(ch)
            prev_us = False
        elif not prev_us:
            out.append("_")
            prev_us = True
    return "".join(out).strip("_")


def reset_stars():
    """Mỗi sao của lasotuvi là một object dùng chung cấp module; anDacTinh chỉ ghi khi ô của bảng
    độ sáng có giá trị, nên độ sáng của lá số trước còn sót lại ở các ô trống (Thiên Mã, Khốc, Hư,
    Hình, Riêu). Xóa trước mỗi lá số để lấy đúng bảng của lasotuvi."""
    for obj in vars(Sao).values():
        if isinstance(obj, Sao.Sao):
            obj.saoDacTinh = None


def run(case):
    reset_stars()
    inp = case["lasoInput"]
    gioi_tinh = 1 if inp["gender"] == "male" else -1
    db = lapDiaBan(diaBan, inp["day"], inp["month"], inp["year"], inp["hour"] + 1, gioi_tinh, False, 7)
    palaces = []
    for cung in db.thapNhiCung[1:]:
        stars = []
        hoa = []
        for sao in cung.cungSao:
            key = slug(sao["saoTen"])
            if key in HOA:
                hoa.append(HOA[key])
                continue
            key = STAR_ALIAS.get(key, key)
            if key in COMPARED:
                stars.append([key, BRIGHTNESS.get(sao.get("saoDacTinh") or "", None)])
        palace_key = slug(cung.cungChu)
        palaces.append({
            "branch": CHI[cung.cungSo - 1],
            "key": PALACE_ALIAS.get(palace_key, palace_key),
            "isBody": bool(cung.cungThan),
            "decadalFrom": getattr(cung, "cungDaiHan", None),
            "stars": stars,
            "hoa": hoa,
            "tuan": bool(getattr(cung, "tuanTrung", False)),
            "triet": bool(getattr(cung, "trietLo", False)),
            # Năm có địa chi này thì tiểu hạn rơi vào cung này.
            "tieuHan": getattr(cung, "cungTieuHan", None),
        })
    return {"id": case["id"], "input": inp, "palaces": palaces}


def main():
    engine = json.loads((HERE / "out" / "engine-nam.json").read_text(encoding="utf-8"))
    results = [run(c) for c in engine if c.get("lasoInput")]
    lines = [json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in results]
    text = '{"lasotuvi":"0.1.2","cases":[\n' + ",\n".join(lines) + "\n]}\n"
    (HERE / "fixtures").mkdir(exist_ok=True)
    (HERE / "fixtures" / "lasotuvi.json").write_text(text, encoding="utf-8")
    print(f"lasotuvi: {len(results)} ca -> fixtures/lasotuvi.json")


if __name__ == "__main__":
    main()
