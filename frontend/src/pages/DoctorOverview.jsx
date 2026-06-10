import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stethoscope, UserPlus, FileText, Pill, Clock, AlertCircle,
  Users, CheckCircle, Clock12, Calendar, TrendingUp, MessageCircle,
  Activity, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clinicalApi } from '../services/api'

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

function StatusBadge({ status }) {
  const map = {
    done: { label: 'Đã khám', class: 'bg-green-50 text-green-700' },
    waiting: { label: 'Chờ', class: 'bg-amber-50 text-amber-700' },
    cancelled: { label: 'Hủy', class: 'bg-red-50 text-red-700' },
  }
  const s = map[status] || map.waiting
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>
      {s.label}
    </span>
  )
}

export default function DoctorOverview() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [schedule, setSchedule] = useState([])
  const [activities, setActivities] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [schedRes, actRes, notifRes] = await Promise.allSettled([
          clinicalApi.getTodaySchedule(),
          clinicalApi.getRecentActivities(),
          clinicalApi.getNotifications(),
        ])
        if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data?.data || [])
        if (actRes.status === 'fulfilled') setActivities(actRes.value.data?.data || [])
        if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data?.data?.slice(0, 5) || [])
      } catch {
        // fallback to empty
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const now = new Date()
  const dayName = DAY_NAMES[now.getDay()]
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const dateStr = `${dayName}, ${dd}/${mm}/${yyyy}`

  const displayName = profile?.full_name || "Người dùng"

  const totalPatients = schedule.length
  const examinedCount = schedule.filter((s) => s.status === 'done').length
  const waitingCount = schedule.filter((s) => s.status === 'waiting').length

  const QUICK_ACTIONS = [
    { title: 'Khám bệnh mới', subtitle: 'Khám bệnh', bg: '#185fa5', icon: Stethoscope, path: '/doctor/exam' },
    { title: 'Tiếp nhận BN', subtitle: 'Đăng ký mới', bg: '#059669', icon: UserPlus, path: '/doctor/intake' },
    { title: 'Hồ sơ bệnh án', subtitle: 'Tra cứu HSBA', bg: '#d97706', icon: FileText, path: '/doctor/records' },
    { title: 'Kê đơn thuốc', subtitle: 'Thuốc điều trị', bg: '#dc2626', icon: Pill, path: '/doctor/prescriptions' },
  ]

  return (
    <div className="pt-5 pr-7 pl-7 overflow-y-auto h-full bg-[#f8f9fc]">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Chào mừng, {displayName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{dateStr}</p>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">Thao tác nhanh</p>
        <div className="grid grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ title, subtitle, bg, icon: Icon, path }) => (
            <div
              key={title}
              onClick={() => navigate(path)}
              className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} value={totalPatients} label="Bệnh nhân hôm nay" bg="bg-blue-50" color="text-blue-600" />
        <StatCard icon={CheckCircle} value={examinedCount} label="Đã khám xong" bg="bg-green-50" color="text-green-600" />
        <StatCard icon={Clock12} value={waitingCount} label="Đang chờ" bg="bg-amber-50" color="text-amber-600" />
        <StatCard icon={Calendar} value={schedule.length ? schedule.length : '0'} label="Lịch hẹn" bg="bg-purple-50" color="text-purple-600" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800">Lịch khám hôm nay</h3>
            <button onClick={() => navigate('/doctor/schedule')} className="text-xs text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-400 py-4 text-center">Đang tải...</p>
            ) : schedule.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Chưa có lịch khám hôm nay</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">Giờ</th>
                    <th className="pb-2 pr-4 font-medium">Bệnh nhân</th>
                    <th className="pb-2 pr-4 font-medium">Lý do</th>
                    <th className="pb-2 font-medium text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((apt, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{apt.time}</td>
                      <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{apt.patient_name || apt.patient}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{apt.reason}</td>
                      <td className="py-3 text-right"><StatusBadge status={apt.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800">Hàng chờ khám</h3>
            <span className="text-xs font-medium text-white bg-blue-600 px-2 py-0.5 rounded-full">{waitingCount}</span>
          </div>
          <div className="space-y-3">
            {schedule.filter((s) => s.status === 'waiting').length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Không có bệnh nhân chờ</p>
            ) : (
              schedule.filter((s) => s.status === 'waiting').map((p, i) => (
                <div key={i} onClick={() => navigate(`/doctor/examination/${p.id}`)} className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 py-2 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.patient_name || p.patient}</p>
                      <p className="text-xs text-slate-400">{p.reason}</p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shrink-0 ml-2">
                    Khám
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Hoạt động gần đây</h3>
          <div className="space-y-0">
            {loading ? (
              <p className="text-sm text-slate-400 py-4 text-center">Đang tải...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Chưa có hoạt động nào</p>
            ) : (
              activities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{act.time}</span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">-</span>
                    <span className="text-sm text-gray-700">{act.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800">Thông báo mới</h3>
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có thông báo</p>
            ) : (
              notifications.map((n, i) => (
                <div key={i} className={`p-2.5 rounded-lg text-xs ${n.read ? 'bg-white' : 'bg-blue-50 border border-blue-100'}`}>
                  <p className={`text-gray-700 ${n.read ? '' : 'font-medium'}`}>{n.message}</p>
                  <p className="text-slate-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, bg, color }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${bg} ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}
