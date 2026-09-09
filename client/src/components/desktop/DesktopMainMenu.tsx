import React, { FC, useState } from 'react';
import {
  Play,
  BookOpen,
  Robot,
  Monitor,
  Globe,
  Sliders,
  ArrowRight,
  User,
  Users,
  Trophy,
  GraduationCap,
  Sparkle,
} from '@phosphor-icons/react';
import { PageState, NotificationType } from '../../types';
const chessboardImg = '/images/Board.png';
const timurArkaImg = '/images/timur-arka.png';
const okulLogo = '/images/okulLogo.png';

interface DesktopMainMenuProps {
  onNavigate: (page: PageState) => void;
  onOpenCredits: () => void;
  onOpenInPersonModal: () => void;
  onOpenOnlineModal: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const DesktopMainMenu: FC<DesktopMainMenuProps> = ({
  onNavigate,
  onOpenCredits,
  onOpenInPersonModal,
  onOpenOnlineModal,
  showNotification,
}) => {
  const [userName] = useState<string>('Misafir');

  const gameModeCards: {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    action: () => void;
    badge?: string;
  }[] = [
    {
      id: 'bot',
      title: 'Bota Karşı Oyna',
      desc: 'Yapay zekâya karşı kendini test et',
      icon: <Robot size={26} weight="regular" />,
      action: () => onNavigate('BOT_SELECT'),
    },
    {
      id: 'local',
      title: 'Ekranda Oyna',
      desc: 'Aynı cihazda arkadaşına karşı oyna',
      icon: <Monitor size={26} weight="regular" />,
      action: onOpenInPersonModal,
    },
    {
      id: 'online',
      title: 'Çevrimiçi Oyna',
      desc: 'Davet koduyla arkadaşınla karşılaş',
      icon: <Globe size={26} weight="regular" />,
      action: onOpenOnlineModal,
    },
    {
      id: 'custom',
      title: 'Serbest Dizilim',
      desc: 'Özel taş dizilimi hazırla & test et',
      icon: <Sliders size={26} weight="regular" />,
      action: () => onNavigate('CUSTOM_SETUP'),
    },
  ];

  return (
    <div className="flex-1 ml-[110px] px-8 lg:px-12 py-6 flex flex-col min-h-screen justify-between relative z-10 select-none bg-gradient-to-b from-[#0c2417] to-[#081810] text-white">

      {/* Arka Plan Vurgu Işıkları */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(0,212,196,0.06)_0%,_transparent_70%)] blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(16,185,129,0.05)_0%,_transparent_70%)] blur-2xl" />
      </div>

      {/* ── 1. ÜST BAŞLIK & KULLANICI BARI ── */}
      <header className="flex justify-between items-center w-full mb-6 relative z-20">

        {/* Sol: Okul Logosu & Künye Butonu */}
        <button
          onClick={onOpenCredits}
          className="flex items-center gap-3.5 bg-black/30 hover:bg-black/45 border border-white/10 hover:border-[#00d4c4]/40 px-4 py-2 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer group shadow-lg"
          title="Hakkında & Künye Bilgileri"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 p-1 flex items-center justify-center overflow-hidden group-hover:border-[#00d4c4]/50 transition-colors">
            <img
              src={okulLogo}
              alt="Kurum Logosu"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[11px] text-[#A7BDB1] font-medium leading-tight">
              Proje Künyesi
            </span>

            <span className="text-xs font-bold text-white group-hover:text-[#00d4c4] transition-colors">
              Hakkında & Emeği Geçenler →
            </span>
          </div>
        </button>

        {/* Sağ: Kullanıcı Profili & Giriş Butonu */}
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center border border-white/20 text-white">
              <User size={18} weight="regular" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[10px] text-[#A7BDB1] leading-tight">
                Hoş geldin,
              </span>

              <span className="text-xs font-bold text-white leading-normal">
                {userName}
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              showNotification(
                'Giriş / Profil paneli yakında açılıyor!',
                'info'
              )
            }
            className="bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-95 text-[#0d2818] font-bold text-xs px-5 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 shadow-[0_4px_16px_rgba(0,212,196,0.3)] hover:shadow-[0_6px_20px_rgba(0,212,196,0.45)]"
          >
            Giriş Yap
          </button>
        </div>
      </header>

      {/* ── 2. ANA PANEL ── */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto w-full relative z-20">

        {/* KOLON 1 */}
        <section className="lg:col-span-4 flex flex-col gap-6 text-left">          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-5xl xl:text-6xl font-black tracking-tight leading-[1.05] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
              Timur
              <br />
              <span className="text-[#00d4c4]">Satrancı</span>
            </h1>
          </div>

          <p className="text-sm xl:text-base text-[#A7BDB1] leading-relaxed max-w-sm">
            Stratejini kur, bilgelikle hamle yap. Geçmişi Keşfet, Geleceği Yönet!
          </p>

          <div className="flex flex-col gap-3 max-w-[280px]">

            <button
              onClick={() => onNavigate('PLAY_MENU')}
              className="bg-[#00d4c4] hover:bg-[#00c4b4] text-[#0d2818] font-batangas font-bold text-lg py-3.5 px-6 rounded-2xl cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,212,196,0.4)] shadow-[0_4px_16px_rgba(0,212,196,0.25)] flex items-center justify-center gap-3 active:scale-95"
            >
              <Play size={20} weight="fill" />
              <span>Oyna</span>
            </button>

            <button
              onClick={() => onNavigate('LEARN_MENU')}
              className="bg-transparent hover:bg-white/10 text-white border-2 border-white/20 hover:border-[#00d4c4]/60 font-batangas font-bold text-lg py-3 px-6 rounded-2xl cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-3 active:scale-95"
            >
              <BookOpen size={20} weight="regular" />
              <span>Öğren</span>
            </button>

          </div>
        </section>

        {/* KOLON 2: SATRANÇ TAHTASI */}
        <section className="lg:col-span-5 relative flex items-center justify-center w-full min-h-[320px] overflow-x-clip lg:-translate-x-6 xl:-translate-x-10">
          <div className="absolute w-[280px] h-[280px] bg-[radial-gradient(circle,_rgba(0,212,196,0.12)_0%,_transparent_70%)] rounded-full blur-2xl pointer-events-none z-0 animate-pulse" />

          {/* Arka plan görseli — tahtanın arkasında, çap viewport'a sığar */}
          <img
            src={timurArkaImg}
            alt=""
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(125%,72vh)] max-w-none aspect-square object-contain pointer-events-none z-0 select-none"
          />

          <img
            src={chessboardImg}
            alt="3D Timur Satranç Tahtası"
            className="w-full max-w-[380px] object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-float"
          />
        </section>

        {/* KOLON 3: OYUN MODLARI */}
        <section className="lg:col-span-3 flex flex-col gap-4">

          {gameModeCards.map((card) => (
            <button
              key={card.id}
              onClick={card.action}
              className="bg-[#f5eedc] hover:bg-[#ede4d0] border border-[#e5dcce] rounded-2xl p-4 flex items-center justify-between text-left cursor-pointer transition-all duration-200 shadow-lg group transform hover:scale-[1.02] active:scale-[0.99]"
            >

              <div className="flex items-center gap-3 min-w-0">

                {/* SİYAH-BEYAZ İKON */}
                <div className="w-12 h-12 rounded-xl bg-[#141f1b]/5 border border-[#141f1b]/10 flex items-center justify-center flex-shrink-0 text-[#141f1b]">
                  <span className="[&>svg]:!text-[#141f1b] [&>svg]:!fill-[#141f1b] [&>svg]:!stroke-[#141f1b] [&>svg]:!w-[26px] [&>svg]:!h-[26px]">
                    {card.icon}
                  </span>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">

                    <span className="text-[#141f1b] font-batangas font-bold text-lg leading-tight">
                      {card.title}
                    </span>

                    {card.badge && (
                      <span className="text-[10px] bg-[#141f1b]/10 text-[#141f1b] border border-[#141f1b]/20 font-bold px-2 py-0.5 rounded-full">
                        {card.badge}
                      </span>
                    )}

                  </div>

                  <span className="text-[#5c6c66] text-sm mt-0.5 truncate">
                    {card.desc}
                  </span>
                </div>
              </div>

              {/* SİYAH-BEYAZ OK */}
              <div className="w-8 h-8 rounded-full bg-[#141f1b]/10 text-[#141f1b] flex items-center justify-center group-hover:bg-[#141f1b] group-hover:text-[#f5eedc] group-hover:-rotate-45 transition-all duration-300 flex-shrink-0 ml-2">
                <ArrowRight size={16} weight="bold" />
              </div>

            </button>
          ))}

        </section>
      </main>

      {/* ── 3. ALT İSTATİSTİK BARI ── */}
      <footer className="mt-8 relative z-20">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/35 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-xl">

          {/* İstatistik 1 */}
          <div className="flex items-center justify-center gap-3.5 relative md:after:content-[''] md:after:absolute md:after:right-[-8px] md:after:top-[20%] md:after:h-[60%] md:after:w-[1px] md:after:bg-white/10 last:after:content-none">

            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl flex-shrink-0 ring-1 ring-blue-400/30">
              <Users size={22} weight="fill" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-lg xl:text-xl font-extrabold text-white leading-tight">
                10.000+
              </span>
              <span className="text-[#A7BDB1] text-[11px] font-semibold">
                Aktif Oyuncu
              </span>
            </div>
          </div>

          {/* İstatistik 2 */}
          <div className="flex items-center justify-center gap-3.5 relative md:after:content-[''] md:after:absolute md:after:right-[-8px] md:after:top-[20%] md:after:h-[60%] md:after:w-[1px] md:after:bg-white/10 last:after:content-none">

            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl flex-shrink-0 ring-1 ring-amber-400/30">
              <Trophy size={22} weight="fill" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-lg xl:text-xl font-extrabold text-white leading-tight">
                1.250
              </span>
              <span className="text-[#A7BDB1] text-[11px] font-semibold">
                Turnuva
              </span>
            </div>
          </div>

          {/* İstatistik 3 */}
          <div className="flex items-center justify-center gap-3.5 relative md:after:content-[''] md:after:absolute md:after:right-[-8px] md:after:top-[20%] md:after:h-[60%] md:after:w-[1px] md:after:bg-white/10 last:after:content-none">

            <div className="p-2.5 bg-violet-500/20 text-violet-300 rounded-xl flex-shrink-0 ring-1 ring-violet-400/30">
              <GraduationCap size={22} weight="fill" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-lg xl:text-xl font-extrabold text-white leading-tight">
                25 Ders
              </span>
              <span className="text-[#A7BDB1] text-[11px] font-semibold">
                70 Bulmaca • 4650 XP
              </span>
            </div>
          </div>

          {/* İstatistik 4 */}
          <div className="flex items-center justify-center gap-3.5">

            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl flex-shrink-0 ring-1 ring-emerald-400/30">
              <Sparkle size={22} weight="fill" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-lg xl:text-xl font-extrabold text-white leading-tight">
                %90+
              </span>
              <span className="text-[#A7BDB1] text-[11px] font-semibold">
                Memnuniyet Oranı
              </span>
            </div>
          </div>

        </div>

        <div className="text-[10px] text-white/30 text-right mt-1.5 mr-2 font-medium">
          *temsilidir
        </div>

      </footer>
    </div>
  );
};