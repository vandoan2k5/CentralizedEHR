import React, { useState, useEffect } from "react";
import {
  User,
  Edit2,
  Save,
  X,
  Phone,
  Mail,
  GraduationCap,
  Award,
  Building,
  Calendar,
  Loader,
} from "lucide-react";
import { clinicalApi } from "../services/api";

export default function DoctorProfile() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tempProfile, setTempProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await clinicalApi.getProfile();
      const data = res.data.data;
      const mapped = {
        name: data.full_name || "",
        specialty: data.specialty || "",
        license: data.practicing_license || "",
        hospital: data.hospital_name || "",
        phone: data.phone_number || "",
        email: data.work_email || "",
        degree: data.highest_degree || "",
        experience:
          data.years_of_experience != null
            ? `${data.years_of_experience} năm`
            : "",
      };
      setProfile(mapped);
      setTempProfile(mapped);
    } catch (err) {
      setError("Không thể tải hồ sơ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = () => {
    setTempProfile({ ...profile });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const changed = {};
      if (tempProfile.name !== profile.name)
        changed.full_name = tempProfile.name;
      if (tempProfile.phone !== profile.phone)
        changed.phone_number = tempProfile.phone;
      if (tempProfile.email !== profile.email)
        changed.work_email = tempProfile.email;
      if (tempProfile.degree !== profile.degree)
        changed.highest_degree = tempProfile.degree;
      if (tempProfile.specialty !== profile.specialty)
        changed.specialty = tempProfile.specialty;
      if (tempProfile.experience !== profile.experience) {
        const years = parseInt(tempProfile.experience.replace(/\D/g, ""), 10);
        if (!isNaN(years)) changed.years_of_experience = years;
      }

      if (Object.keys(changed).length > 0) {
        await clinicalApi.updateProfile(changed);
      }

      setProfile({ ...tempProfile });
      setEditing(false);
    } catch (err) {
      // handle save error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempProfile({ ...profile });
    setEditing(false);
  };

  const handleChange = (field) => (e) => {
    setTempProfile({ ...tempProfile, [field]: e.target.value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Hồ sơ bác sĩ</h1>
        <p className="text-sm text-slate-500 mt-1">
          Thông tin cá nhân và chuyên môn
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={tempProfile.name}
                onChange={handleChange("name")}
                className="text-xl font-bold text-slate-800 w-full px-3 py-1 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h2 className="text-xl font-bold text-slate-800">
                {profile.name}
              </h2>
            )}
            <p className="text-sm text-blue-600 font-medium mt-1">
              {profile.specialty}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Award size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">
                Chứng chỉ: {profile.license}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <Loader size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  Lưu
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <X size={15} /> Hủy
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit2 size={15} /> Chỉnh sửa
              </button>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ProfileField
              label="Chuyên khoa"
              icon={User}
              value={editing ? tempProfile.specialty : profile.specialty}
              editing={editing}
              onChange={handleChange("specialty")}
            />
            <ProfileField
              label="Chứng chỉ hành nghề"
              icon={Award}
              value={profile.license}
              readOnly
            />
            <ProfileField
              label="Bệnh viện"
              icon={Building}
              value={profile.hospital}
              readOnly
            />
            <ProfileField
              label="Số điện thoại"
              icon={Phone}
              value={editing ? tempProfile.phone : profile.phone}
              editing={editing}
              onChange={handleChange("phone")}
            />
            <ProfileField
              label="Email"
              icon={Mail}
              value={editing ? tempProfile.email : profile.email}
              editing={editing}
              onChange={handleChange("email")}
            />
            <ProfileField
              label="Học vị"
              icon={GraduationCap}
              value={editing ? tempProfile.degree : profile.degree}
              editing={editing}
              onChange={handleChange("degree")}
            />
            <ProfileField
              label="Kinh nghiệm"
              icon={Calendar}
              value={editing ? tempProfile.experience : profile.experience}
              editing={editing}
              onChange={handleChange("experience")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  icon: Icon,
  value,
  editing,
  onChange,
  readOnly,
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
        <Icon size={13} />
        {label}
      </label>
      {editing && !readOnly ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <p className="text-sm font-medium text-slate-800">{value}</p>
      )}
    </div>
  );
}
