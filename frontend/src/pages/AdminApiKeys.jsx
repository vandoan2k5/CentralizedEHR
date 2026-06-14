import { useState, useEffect } from "react";
import { adminApi } from "../services/api";
import {
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  Copy,
  Check,
  Loader,
  Shield,
} from "lucide-react";

export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | revoked

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [keysRes, hospRes] = await Promise.all([
        adminApi.getApiKeys(),
        adminApi.getHospitals(),
      ]);
      setKeys(keysRes.data.data || []);
      setHospitals(hospRes.data || []);
    } catch {
      setError("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const issueKey = async (hospitalId) => {
    setActionLoading(hospitalId + "_issue");
    setNewKeyResult(null);
    try {
      const { data } = await adminApi.issueApiKey(hospitalId);
      setNewKeyResult(data);
      flash("Đã cấp API Key thành công");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi cấp API key");
    } finally {
      setActionLoading("");
    }
  };

  const revokeKey = async (hospitalId, hospitalName) => {
    if (!confirm(`Thu hồi API Key của "${hospitalName}"?`)) return;
    setActionLoading(hospitalId + "_revoke");
    try {
      await adminApi.revokeApiKey(hospitalId);
      flash(`Đã thu hồi API Key của ${hospitalName}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi thu hồi");
    } finally {
      setActionLoading("");
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hospitals chưa có key
  const hospitalsWithKeys = new Set(keys.map((k) => k.hospital_id));
  const hospitalsWithoutKey = hospitals.filter(
    (h) => !hospitalsWithKeys.has(h.id),
  );

  const filteredKeys = keys.filter((k) =>
    filter === "all" ? true : filter === "active" ? k.is_active : !k.is_active,
  );

  const activeCount = keys.filter((k) => k.is_active).length;
  const revokedCount = keys.filter((k) => !k.is_active).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Tổng keys",
            value: keys.length,
            color: "bg-slate-50 text-slate-700",
            filter: "all",
          },
          {
            label: "Đang hoạt động",
            value: activeCount,
            color: "bg-green-50 text-green-700",
            filter: "active",
          },
          {
            label: "Đã thu hồi",
            value: revokedCount,
            color: "bg-red-50 text-red-700",
            filter: "revoked",
          },
        ].map(({ label, value, color, filter: f }) => (
          <button
            key={label}
            onClick={() => setFilter(f)}
            className={`rounded-xl p-4 text-left border-2 transition-all ${filter === f ? "border-blue-500" : "border-transparent"} ${color}`}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-80">{label}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={15} />
          {success}
        </div>
      )}

      {/* Kết quả key mới */}
      {newKeyResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle size={16} /> API Key mới đã được tạo
            </p>
            <button
              onClick={() => setNewKeyResult(null)}
              className="text-green-600"
            >
              <XCircle size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white rounded-lg px-3 py-2 text-sm font-mono break-all border">
              {newKeyResult.api_key}
            </code>
            <button
              onClick={() => copyKey(newKeyResult.api_key)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check size={14} /> Đã copy
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
          </div>
          {newKeyResult.key_prefix && (
            <p className="text-xs text-slate-500 mt-2">
              Prefix:{" "}
              <span className="font-mono">{newKeyResult.key_prefix}</span>
            </p>
          )}
          <p className="text-xs text-red-600 mt-1 font-medium">
            ⚠ Chỉ hiển thị một lần — sao chép ngay!
          </p>
        </div>
      )}

      {/* Cơ sở chưa có key */}
      {hospitalsWithoutKey.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
            <AlertCircle size={15} /> {hospitalsWithoutKey.length} cơ sở chưa có
            API Key
          </p>
          <div className="flex flex-wrap gap-2">
            {hospitalsWithoutKey.map((h) => (
              <button
                key={h.id}
                onClick={() => issueKey(h.id)}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
              >
                {actionLoading === h.id + "_issue" ? (
                  <Loader size={11} className="animate-spin" />
                ) : (
                  <Key size={11} />
                )}
                Cấp key cho {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách keys */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <span className="text-sm text-slate-500">
              Hiển thị <strong>{filteredKeys.length}</strong> API keys
            </span>
            <button
              onClick={load}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Cơ sở y tế</th>
                <th className="px-4 py-3 font-medium">Key Prefix</th>
                <th className="px-4 py-3 font-medium">Ngày cấp</th>
                <th className="px-4 py-3 font-medium">Thu hồi lúc</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((k) => (
                <tr
                  key={k.id}
                  className="border-b last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2
                        size={13}
                        className="text-slate-400 shrink-0"
                      />
                      <span className="font-medium text-slate-800">
                        {k.hospital_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {k.key_prefix ? (
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                        {k.key_prefix}...
                      </code>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {k.created_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(k.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {k.revoked_at ? (
                      <div className="flex items-center gap-1 text-red-500">
                        <Clock size={11} />
                        {new Date(k.revoked_at).toLocaleDateString("vi-VN")}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {k.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
                        <Shield size={10} /> Hoạt động
                      </span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
                        <XCircle size={10} /> Đã thu hồi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => issueKey(k.hospital_id)}
                        disabled={!!actionLoading}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading === k.hospital_id + "_issue" ? (
                          <Loader size={11} className="animate-spin" />
                        ) : (
                          <RefreshCw size={11} />
                        )}
                        Cấp lại
                      </button>
                      {k.is_active && (
                        <button
                          onClick={() =>
                            revokeKey(k.hospital_id, k.hospital_name)
                          }
                          disabled={!!actionLoading}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === k.hospital_id + "_revoke" ? (
                            <Loader size={11} className="animate-spin" />
                          ) : (
                            <XCircle size={11} />
                          )}
                          Thu hồi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredKeys.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <Key size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Không có API key nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
