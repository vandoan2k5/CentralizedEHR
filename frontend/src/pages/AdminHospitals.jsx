import { useState, useEffect } from "react";
import { adminApi } from "../services/api";
import {
  Building2,
  Plus,
  Key,
  X,
  Check,
  AlertCircle,
  MapPin,
  Tag,
  Copy,
  CheckCircle,
  Loader,
} from "lucide-react";

const LEVEL_LABELS = {
  CENTRAL: { label: "Trung ương", color: "bg-red-100 text-red-700" },
  PROVINCIAL: { label: "Tỉnh", color: "bg-blue-100 text-blue-700" },
  DISTRICT: { label: "Huyện", color: "bg-green-100 text-green-700" },
  CLINIC: { label: "Phòng khám", color: "bg-purple-100 text-purple-700" },
  PRIVATE: { label: "Tư nhân", color: "bg-amber-100 text-amber-700" },
};

export default function AdminHospitals({ onHospitalsLoaded }) {
  const [hospitals, setHospitals] = useState([]);
  const [apiKeys, setApiKeys] = useState({}); // hospital_id -> key info
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    level: "",
    address: "",
  });
  const [search, setSearch] = useState("");
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getHospitals();
      setHospitals(data);
      onHospitalsLoaded?.(data);
    } catch {
      setError("Lỗi tải danh sách cơ sở y tế");
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const { data } = await adminApi.getApiKeys();
      const map = {};
      (data.data || []).forEach((k) => {
        map[k.hospital_id] = k;
      });
      setApiKeys(map);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadHospitals();
    loadApiKeys();
  }, []);

  const createHospital = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.createHospital(form);
      setShowForm(false);
      setForm({ code: "", name: "", level: "", address: "" });
      flash("Đã tạo cơ sở y tế thành công");
      loadHospitals();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi tạo cơ sở y tế");
    } finally {
      setLoading(false);
    }
  };

  const issueKey = async (hospitalId) => {
    setActionLoading(hospitalId + "_issue");
    setNewKeyResult(null);
    try {
      const { data } = await adminApi.issueApiKey(hospitalId);
      setNewKeyResult({ ...data, hospital_id: hospitalId });
      flash("Đã cấp API Key thành công");
      loadApiKeys();
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
      setApiKeys((prev) => {
        const next = { ...prev };
        if (next[hospitalId])
          next[hospitalId] = {
            ...next[hospitalId],
            is_active: false,
            revoked_at: new Date().toISOString(),
          };
        return next;
      });
      loadApiKeys();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi thu hồi API key");
    } finally {
      setActionLoading("");
    }
  };

  const filteredHospitals = hospitals.filter((h) =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.code?.toLowerCase().includes(search.toLowerCase()) ||
    h.address?.toLowerCase().includes(search.toLowerCase())
  );

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm cơ sở y tế..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={16} /> Thêm cơ sở
        </button>
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

      {/* Form thêm cơ sở */}
      {showForm && (
        <form
          onSubmit={createHospital}
          className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
        >
          <h3 className="font-semibold text-slate-800">Thêm cơ sở y tế mới</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Mã cơ sở *", "code", "BV-001"],
              ["Tên cơ sở *", "name", ""],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cấp
              </label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Chọn --</option>
                {Object.entries(LEVEL_LABELS).map(([v, { label }]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Địa chỉ
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo cơ sở y tế"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Kết quả cấp key mới */}
      {newKeyResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle size={16} /> API Key đã được cấp
            </p>
            <button
              onClick={() => setNewKeyResult(null)}
              className="text-green-600 hover:text-green-800"
            >
              <X size={16} />
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
          <p className="text-xs text-red-600 mt-2 font-medium">
            ⚠ Chỉ hiển thị một lần — sao chép ngay!
          </p>
        </div>
      )}

      {/* Danh sách hospitals */}
      {loading && !hospitals.length ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHospitals.map((h) => {
            const keyInfo = apiKeys[h.id];
            const hasActiveKey = keyInfo?.is_active === true;
            const levelCfg = LEVEL_LABELS[h.level] || {
              label: h.level,
              color: "bg-slate-100 text-slate-600",
            };
            const isIssuing = actionLoading === h.id + "_issue";
            const isRevoking = actionLoading === h.id + "_revoke";

            return (
              <div
                key={h.id}
                className="bg-white rounded-xl shadow-sm border p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 size={15} className="text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {h.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelCfg.color}`}
                      >
                        {levelCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Tag size={11} /> {h.code}
                      </span>
                      {h.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {h.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Key status */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Key size={11} /> API Key
                    </span>
                    {hasActiveKey ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Đang hoạt động
                      </span>
                    ) : keyInfo?.revoked_at ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Đã thu hồi
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Chưa cấp
                      </span>
                    )}
                  </div>

                  {keyInfo && (
                    <div className="text-xs text-slate-400 mb-3 space-y-0.5">
                      {keyInfo.key_prefix && (
                        <p>
                          Prefix:{" "}
                          <span className="font-mono text-slate-600">
                            {keyInfo.key_prefix}...
                          </span>
                        </p>
                      )}
                      {keyInfo.created_at && (
                        <p>
                          Cấp lúc:{" "}
                          {new Date(keyInfo.created_at).toLocaleString(
                            "vi-VN",
                            { timeZone: "Asia/Ho_Chi_Minh" },
                          )}
                        </p>
                      )}
                      {keyInfo.revoked_at && (
                        <p className="text-red-500">
                          Thu hồi lúc:{" "}
                          {new Date(keyInfo.revoked_at).toLocaleString(
                            "vi-VN",
                            { timeZone: "Asia/Ho_Chi_Minh" },
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => issueKey(h.id)}
                      disabled={!!actionLoading}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isIssuing ? (
                        <Loader size={12} className="animate-spin" />
                      ) : (
                        <Key size={12} />
                      )}
                      {hasActiveKey ? "Cấp lại" : "Cấp Key"}
                    </button>
                    {hasActiveKey && (
                      <button
                        onClick={() => revokeKey(h.id, h.name)}
                        disabled={!!actionLoading}
                        className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isRevoking ? (
                          <Loader size={12} className="animate-spin" />
                        ) : (
                          <X size={12} />
                        )}
                        Thu hồi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
