import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { label: 'คอร์สเรียน', href: '/courses' },
      { label: 'แดชบอร์ด', href: '/dashboard' },
      { label: 'เกี่ยวกับเรา', href: '/about' },
      { label: 'ติดต่อเรา', href: '/contact' },
    ],
    support: [
      { label: 'ศูนย์ช่วยเหลือ', href: '/help' },
      { label: 'คำถามที่พบบ่อย', href: '/faq' },
      { label: 'นโยบายความเป็นส่วนตัว', href: '/privacy' },
      { label: 'เงื่อนไขการใช้งาน', href: '/terms' },
    ],
    social: [
      { label: 'Facebook', href: '#' },
      { label: 'Twitter', href: '#' },
      { label: 'Instagram', href: '#' },
      { label: 'YouTube', href: '#' },
    ],
  };

  return (
    <footer className="bg-bg-secondary border-t border-border-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-bold text-xl text-text-primary">EduLearn</span>
            </Link>
            <p className="text-text-secondary text-sm mb-4">
              แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทำให้การศึกษาเป็นเรื่องสนุก
            </p>
            <div className="flex gap-3">
              {footerLinks.social.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-text-secondary hover:bg-primary-100 hover:text-primary-600 transition-colors"
                  aria-label={link.label}
                >
                  <span className="text-sm">{link.label[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-text-primary mb-4">แพลตฟอร์ม</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-primary-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-text-primary mb-4">ช่วยเหลือ</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-primary-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-text-primary mb-4">ติดตามข่าวสาร</h3>
            <p className="text-sm text-text-secondary mb-4">
              รับข่าวสารและอัปเดตล่าสุดจากเรา
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="อีเมลของคุณ"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border-light bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                สมัคร
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border-light">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-text-secondary">
              © {currentYear} EduLearn. สงวนลิขสิทธิ์ทั้งหมด
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-text-secondary hover:text-primary-600">
                ความเป็นส่วนตัว
              </Link>
              <Link href="/terms" className="text-sm text-text-secondary hover:text-primary-600">
                เงื่อนไข
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
