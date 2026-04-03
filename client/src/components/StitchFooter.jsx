import { Link } from 'react-router-dom';

export default function StitchFooter() {
  return (
    <footer className="bg-surface border-t border-surface-variant py-12 px-8 mt-auto">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold text-primary tracking-tighter font-headline">Sentinal</span>
          <p className="text-[11px] text-on-surface-variant font-medium tracking-wide uppercase">
            © {new Date().getFullYear()} Sentinal infrastructure
          </p>
        </div>
        <div className="flex flex-wrap gap-8">
          <Link
            to="/how-it-works"
            className="text-[13px] text-on-surface-variant hover:text-primary font-medium transition-colors"
          >
            How it works
          </Link>
          <a
            href="https://github.com"
            className="text-[13px] text-on-surface-variant hover:text-primary font-medium transition-colors"
          >
            Documentation
          </a>
          <Link
            to="/marketplace"
            className="text-[13px] text-on-surface-variant hover:text-primary font-medium transition-colors"
          >
            Marketplace
          </Link>
        </div>
      </div>
    </footer>
  );
}
