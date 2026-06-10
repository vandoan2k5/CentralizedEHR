import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clinicalApi } from "../services/api";
import { Search, Users, User, Loader, AlertCircle, ChevronRight } from "lucide-react";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
  return age;
}

export default function DoctorPatients() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(location.state?.page || 1);
  const itemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = search.trim().length >= 2 ? { search: search.trim() } : {};
        const { data } = await clinicalApi.searchPatients(params);
        setPatients(data.data || []);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = patients;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleViewPatient = (id) => {
    navigate(`/doctor/patient-detail/${id}`, { state: { page: currentPage } });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Danh sách bệnh nhân</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý thông tin và hồ sơ bệnh nhân</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tìm theo tên hoặc CCCD..."
          />
        </div>
        <span className="text-xs text-slate-400 self-center">
          {searched ? `${filtered.length} bệnh nhân` : ""}
        </span>
      </div>

      {loading && (
        <div className="space-y-3 py-4">
          {[1, 2, 3, 4, 5].map((i) => (
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

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <AlertCircle size={44} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Không tìm thấy bệnh nhân</p>
          <p className="text-xs text-slate-400 mt-1">Thử lại với từ khóa khác</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                <th className="px-4 py-3 font-medium w-12">STT</th>
                <th className="px-4 py-3 font-medium">Tên bệnh nhân</th>
                <th className="px-4 py-3 font-medium">Tuổi</th>
                <th className="px-4 py-3 font-medium">Giới tính</th>
                <th className="px-4 py-3 font-medium">CCCD</th>
                <th className="px-4 py-3 font-medium">SĐT</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => handleViewPatient(p.id)}
                  className="border-b last:border-0 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-slate-500">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <User size={14} className="text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                        {p.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {calcAge(p.dob) !== null ? `${calcAge(p.dob)} tuổi` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : p.gender || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {p.identity_number || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.phone_number || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Trang {currentPage}/{totalPages}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
