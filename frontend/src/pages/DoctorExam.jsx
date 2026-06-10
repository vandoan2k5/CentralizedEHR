import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clinicalApi } from "../services/api";
import { Search, Stethoscope, User, Loader, AlertCircle, X } from "lucide-react";

function highlightText(text, keyword) {
  if (!keyword.trim()) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-slate-800 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function DoctorExam() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) {
      setPatients([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await clinicalApi.searchPatients({ search: search.trim() });
        setPatients(data.data || []);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = (patientId) => {
    navigate(`/doctor/examination/${patientId}`);
  };

  const clearSearch = () => {
    setSearch("");
    setPatients([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Khám bệnh</h1>
        <p className="text-sm text-slate-500 mt-0.5">Tra cứu bệnh nhân để tạo phiên khám mới</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-shadow"
          placeholder="Tìm theo tên, CCCD, hoặc mã bệnh nhân..."
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && searched && patients.length === 0 && (
        <div className="text-center py-16">
          <AlertCircle size={44} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Không tìm thấy bệnh nhân</p>
          <p className="text-xs text-slate-400 mt-1">Thử lại với tên, CCCD hoặc mã bệnh nhân khác</p>
        </div>
      )}

      {/* Results */}
      {!loading && patients.length > 0 && (
        <div className="space-y-2">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                <User size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {highlightText(p.full_name, search)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 space-x-2">
                  {p.identity_number && (
                    <span>CCCD: {highlightText(p.identity_number, search)}</span>
                  )}
                  {p.dob && (
                    <span>· {new Date().getFullYear() - new Date(p.dob).getFullYear()} tuổi</span>
                  )}
                  {p.gender && (
                    <span>· {p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : p.gender}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám</span>
                <Stethoscope size={14} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hint when no search */}
      {!searched && !loading && (
        <div className="text-center py-16">
          <Stethoscope size={44} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 text-sm">Nhập ít nhất 2 ký tự để tìm kiếm bệnh nhân</p>
        </div>
      )}
    </div>
  );
}
