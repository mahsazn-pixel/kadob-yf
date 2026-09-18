import { useState, useRef, useEffect } from 'react'
import { Gift, Phone, ShieldCheck, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

type Step = 'phone' | 'otp' | 'success'
type Mode = 'login' | 'signup'

export default function LoginPage() {
  const { session, signInLocal } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (session) navigate('/')
  }, [session, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handlePhoneSubmit = async () => {
    setError('')
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل نامعتبر است. مثال: 09123456789')
      return
    }
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 400))
    setStep('otp')
    setCountdown(60)
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d) && newOtp.join('').length === 6) {
      handleOtpVerify(newOtp.join(''))
    }
  }

  const handleOtpVerify = async (code: string) => {
    setError('')
    if (code.length !== 6) {
      setError('کد ۶ رقمی را وارد کنید')
      return
    }
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 400))
    signInLocal(phone)
    setStep('success')
    setLoading(false)
    setTimeout(() => navigate('/'), 800)
  }

  const resendOtp = async () => {
    if (countdown > 0) return
    setOtp(['', '', '', '', '', ''])
    setError('')
    await handlePhoneSubmit()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-primary-500 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
            <Gift size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">کادوبا</h1>
          <p className="text-sm text-stone-500 mt-1">کشف هدیه هوشمند</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm animate-slide-up">
            {error}
          </div>
        )}

        {step === 'phone' && (
          <div className="animate-slide-up space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
              <label className="text-sm font-medium text-stone-600 mb-2 block">شماره موبایل</label>
              <div className="relative">
                <Phone size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  className="w-full pr-11 pl-4 py-3.5 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-base tracking-wider"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'login' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                }`}
              >
                ورود
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'signup' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                }`}
              >
                ثبت‌نام
              </button>
            </div>

            <button
              onClick={handlePhoneSubmit}
              disabled={loading || phone.length < 11}
              className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'دریافت کد تأیید'}
            </button>

            <p className="text-center text-xs text-stone-400 leading-relaxed">
              با ورود به کادوبا، قوانین و حریم خصوصی را می‌پذیرید.
            </p>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-slide-up space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={20} className="text-primary-500" />
                <p className="text-sm text-stone-600">کد ۶ رقمی ارسال شده به</p>
              </div>
              <p className="text-base font-semibold text-stone-800 mb-4" dir="ltr">{phone}</p>
              <div className="flex gap-2 justify-between" dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => handleOtpVerify(otp.join(''))}
              disabled={loading || otp.join('').length < 6}
              className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'تأیید و ورود'}
            </button>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-stone-400">ارسال مجدد در {countdown} ثانیه</p>
              ) : (
                <button onClick={resendOtp} className="text-sm text-primary-600 font-medium hover:underline">
                  ارسال مجدد کد
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep('phone'); setError(''); setOtp(['', '', '', '', '', '']) }}
              className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              تغییر شماره
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="animate-pop flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mb-4">
              <ShieldCheck size={40} className="text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-800">خوش آمدید!</h2>
            <p className="text-sm text-stone-500 mt-1">در حال انتقال...</p>
          </div>
        )}
      </div>
    </div>
  )
}
