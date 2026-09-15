import {
  Activity,
  AlertTriangle,
  Ambulance,
  Baby,
  Brain,
  Droplet,
  HeartPulse,
  Map as MapIcon,
  MapPin,
  Phone,
  PhoneIncoming,
  ShieldAlert,
  User,
  Wind,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const PROTOCOLS = [
  {
    id: 'cardiac',
    label: 'Καρδιολογικό',
    icon: HeartPulse,
    color: 'red',
    keywords: [
      'πόνος στο στήθος',
      'στηθάγχη',
      'καρδιά',
      'καρδιακή προσβολή',
      'έμφραγμα',
      'δύσπνοια',
      'εφίδρωση',
      'ταχυκαρδία',
      'αρρυθμία',
      'πίεση στο στήθος',
      'μούδιασμα στο χέρι',
    ],
  },
  {
    id: 'respiratory',
    label: 'Αναπνευστικό',
    icon: Wind,
    color: 'sky',
    keywords: [
      'δύσπνοια',
      'δεν μπορεί να αναπνεύσει',
      'ασθματικό',
      'άσθμα',
      'βήχας',
      'πνιγμός',
      'συριγμός',
      'κοφτή αναπνοή',
      'ασφυξία',
      'μπλε χείλη',
    ],
  },
  {
    id: 'neuro',
    label: 'Νευρολογικό',
    icon: Brain,
    color: 'purple',
    keywords: [
      'εγκεφαλικό',
      'παράλυση',
      'μούδιασμα',
      'ζαλάδα',
      'σύγχυση',
      'δεν μιλάει καθαρά',
      'στραβό στόμα',
      'λιποθυμία',
      'σπασμοί',
      'έντονος πονοκέφαλος',
    ],
  },
  {
    id: 'trauma',
    label: 'Τραύμα',
    icon: Ambulance,
    color: 'orange',
    keywords: [
      'ατύχημα',
      'αιμορραγία',
      'πτώση',
      'κάταγμα',
      'τροχαίο',
      'πληγή',
      'μαχαίρι',
      'χτύπημα στο κεφάλι',
      'ασυνειδησία',
      'αίμα',
    ],
  },
  {
    id: 'allergic',
    label: 'Αλλεργικό',
    icon: ShieldAlert,
    color: 'amber',
    keywords: [
      'αλλεργία',
      'πρήξιμο προσώπου',
      'κνίδωση',
      'τσίμπημα',
      'αναφυλαξία',
      'φαγούρα',
      'πρήξιμο λαιμού',
      'δύσπνοια μετά από φαγητό',
    ],
  },
  {
    id: 'obstetric',
    label: 'Μαιευτικό',
    icon: Baby,
    color: 'pink',
    keywords: [
      'τοκετός',
      'εγκυμοσύνη',
      'έγκυος',
      'ωδίνες',
      'σπάσιμο νερών',
      'αιμορραγία εγκύου',
      'συστολές',
      'θα γεννήσει',
    ],
  },
  {
    id: 'psychiatric',
    label: 'Ψυχιατρικό',
    icon: AlertTriangle,
    color: 'indigo',
    keywords: [
      'αυτοκτονία',
      'πανικός',
      'κρίση πανικού',
      'επιθετικότητα',
      'παραλήρημα',
      'δεν αναγνωρίζει',
      'ψυχωτικό επεισόδιο',
      'θέλει να αυτοκτονήσει',
    ],
  },
  {
    id: 'diabetic',
    label: 'Διαβητικό',
    icon: Droplet,
    color: 'teal',
    keywords: [
      'διαβήτης',
      'υπογλυκαιμία',
      'ζάχαρο',
      'ινσουλίνη',
      'τρέμουλο',
      'κρύος ιδρώτας',
      'λιποθυμία διαβητικού',
    ],
  },
]

const COLOR_CLASSES = {
  red: { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200', icon: 'text-red-500' },
  sky: { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', ring: 'ring-sky-200', icon: 'text-sky-500' },
  purple: { bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', ring: 'ring-purple-200', icon: 'text-purple-500' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200', icon: 'text-orange-500' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200', icon: 'text-amber-500' },
  pink: { bar: 'bg-pink-500', text: 'text-pink-700', bg: 'bg-pink-50', ring: 'ring-pink-200', icon: 'text-pink-500' },
  indigo: { bar: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200', icon: 'text-indigo-500' },
  teal: { bar: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50', ring: 'ring-teal-200', icon: 'text-teal-500' },
}

function normalize(text) {
  return text.toLowerCase()
}

function useProtocolMatches(transcript) {
  return useMemo(() => {
    const text = normalize(transcript)
    return PROTOCOLS.map((protocol) => {
      const matched = protocol.keywords.filter((keyword) => text.includes(keyword))
      const percentage = text.trim()
        ? Math.round((matched.length / protocol.keywords.length) * 100)
        : 0
      return { ...protocol, matched, percentage }
    }).sort((a, b) => b.percentage - a.percentage)
  }, [transcript])
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-red-600 text-red-700'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      <Icon size={18} />
      {children}
    </button>
  )
}

function CallReceptionTab({ callerPhone, setCallerPhone, address, setAddress, callerName, setCallerName, transcript, setTranscript, matches }) {
  const topMatch = matches[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <Phone size={16} className="text-slate-400" />
            Τηλέφωνο καλούντος
          </label>
          <input
            type="tel"
            value={callerPhone}
            onChange={(e) => setCallerPhone(e.target.value)}
            placeholder="π.χ. 6971234567"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <MapPin size={16} className="text-slate-400" />
            Διεύθυνση συμβάντος
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Οδός, αριθμός, περιοχή"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
            <User size={16} className="text-slate-400" />
            Όνομα καλούντος
          </label>
          <input
            type="text"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="Ονοματεπώνυμο"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {topMatch && topMatch.percentage > 0 && (
          <div className={`rounded-lg p-3 ring-1 ${COLOR_CLASSES[topMatch.color].bg} ${COLOR_CLASSES[topMatch.color].ring}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Πιθανό πρωτόκολλο</p>
            <div className={`flex items-center gap-2 font-semibold ${COLOR_CLASSES[topMatch.color].text}`}>
              <topMatch.icon size={18} />
              {topMatch.label} · {topMatch.percentage}%
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Καταγραφή λόγων καλούντος
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Πληκτρολογήστε ό,τι αναφέρει ο καλών σε ελεύθερο κείμενο..."
          rows={16}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
        />
      </div>

      <div className="lg:col-span-1">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <Activity size={16} className="text-slate-400" />
          Αντιστοίχιση ιατρικών πρωτοκόλλων (live)
        </p>
        <div className="space-y-2">
          {matches.map((protocol) => {
            const colors = COLOR_CLASSES[protocol.color]
            const Icon = protocol.icon
            return (
              <div key={protocol.id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Icon size={16} className={colors.icon} />
                    {protocol.label}
                  </div>
                  <span className={`text-sm font-semibold ${protocol.percentage > 0 ? colors.text : 'text-slate-400'}`}>
                    {protocol.percentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
                    style={{ width: `${protocol.percentage}%` }}
                  />
                </div>
                {protocol.matched.length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-500 truncate">
                    {protocol.matched.join(' · ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlaceholderTab({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
      <Icon size={48} className="mb-4" />
      <h3 className="text-lg font-medium text-slate-600">{title}</h3>
      <p className="text-sm mt-1">{description}</p>
    </div>
  )
}

export default function EKABDispatchSystem() {
  const [activeTab, setActiveTab] = useState('reception')
  const [callerPhone, setCallerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [callerName, setCallerName] = useState('')
  const [transcript, setTranscript] = useState('')

  const matches = useProtocolMatches(transcript)

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-red-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Ambulance size={28} />
          <div>
            <h1 className="text-xl font-bold leading-tight">ΕΚΑΒ · Σύστημα Διαχείρισης Κλήσεων</h1>
            <p className="text-red-100 text-xs">Εθνικό Κέντρο Άμεσης Βοήθειας</p>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-2">
          <TabButton active={activeTab === 'reception'} onClick={() => setActiveTab('reception')} icon={PhoneIncoming}>
            Παραλαβή Κλήσης
          </TabButton>
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} icon={Ambulance}>
            Μονάδες
          </TabButton>
          <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={MapIcon}>
            Χάρτης
          </TabButton>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'reception' && (
          <CallReceptionTab
            callerPhone={callerPhone}
            setCallerPhone={setCallerPhone}
            address={address}
            setAddress={setAddress}
            callerName={callerName}
            setCallerName={setCallerName}
            transcript={transcript}
            setTranscript={setTranscript}
            matches={matches}
          />
        )}
        {activeTab === 'units' && (
          <PlaceholderTab
            icon={Ambulance}
            title="Διαχείριση Μονάδων"
            description="Η οθόνη διαθεσιμότητας και ανάθεσης ασθενοφόρων θα προστεθεί σύντομα."
          />
        )}
        {activeTab === 'map' && (
          <PlaceholderTab
            icon={MapIcon}
            title="Χάρτης Συμβάντων"
            description="Η χαρτογραφική απεικόνιση κλήσεων και μονάδων θα προστεθεί σύντομα."
          />
        )}
      </main>
    </div>
  )
}
