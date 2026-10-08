'use client'

import React, { useRef, useState } from 'react'
import { Camera, Check, Settings, Trash2, User, X } from 'lucide-react'
import { saveUserProfile, type Account } from '@/lib/accounts'
import { useToast } from './ui-bits'

interface ProfileSettingsModalProps {
  user: Account
  isOpen: boolean
  onClose: () => void
  onUpdate: (updated: Account) => void
}

export function ProfileSettingsModal({ user, isOpen, onClose, onUpdate }: ProfileSettingsModalProps) {
  const notify = useToast()
  const [name, setName] = useState(user.name)
  const [avatar, setAvatar] = useState<string | undefined>(user.avatar)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      notify('Ukuran foto terlalu besar (maksimal 2MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string
      setAvatar(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!name.trim()) {
      notify('Nama lengkap wajib diisi')
      return
    }

    setSaving(true)
    const updates = { name: name.trim(), avatar }
    saveUserProfile(user.username, updates)
    const updatedUser: Account = { ...user, ...updates }
    onUpdate(updatedUser)
    notify('Profil berhasil diperbarui')
    setSaving(false)
    onClose()
  }

  const initials = (name || user.name)
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[#061e14]/95 p-6 sm:p-7 shadow-2xl text-[#e8f5ec]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#a3e635]/15 text-[#a3e635]">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pengaturan Profil</h3>
              <p className="text-[11px] text-[#8fa99b]">Ubah nama dan foto profil akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar Upload Section */}
        <div className="my-6 flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#a3e635]/50 bg-gradient-to-br from-[#123824] to-[#082015] shadow-lg">
              {avatar ? (
                <img src={avatar} alt="Foto Profil" className="size-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-[#a3e635] tracking-wider">{initials}</span>
              )}
            </div>

            {/* Quick Upload Hover overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold"
            >
              <Camera size={20} className="mb-1" />
              Ganti
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              <Camera size={14} />
              Pilih Foto
            </button>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar(undefined)}
                className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
                title="Hapus Foto"
              >
                <Trash2 size={13} />
                Hapus
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#8fa99b]">Format JPG, PNG atau GIF (Maks. 2MB)</p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8fa99b] mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative rounded-xl border border-white/15 bg-white/5 focus-within:border-[#a3e635] focus-within:ring-1 focus-within:ring-[#a3e635] transition">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full bg-transparent px-3.5 py-2.5 text-sm font-semibold text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8fa99b] mb-1.5">
              Role & Jabatan (Permanen)
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-[#8fa99b] flex items-center justify-between">
              <span>{user.title}</span>
              <span className="rounded-full bg-[#a3e635]/15 px-2 py-0.5 text-[10px] font-bold text-[#a3e635]">
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-[#8fa99b] hover:bg-white/10 hover:text-white transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] px-5 py-2 text-xs font-bold text-[#052e16] shadow-lg shadow-[#84cc16]/20 hover:brightness-110 active:scale-95 transition"
          >
            <Check size={14} />
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  )
}
