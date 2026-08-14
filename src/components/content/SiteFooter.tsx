/**
 * Site-wide footer landmark. Previously the only <footer> in the app was
 * nested inside <main> on Contact.tsx (part of the homepage's Contact
 * section), which means it was never a real `contentinfo` landmark and
 * never appeared on any other route. This renders once, outside <main>,
 * on every page.
 */
function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white px-4 py-8 text-center md:px-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        &copy; {new Date().getFullYear()} Trần Nguyễn Anh Khoa
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-tighter text-slate-500">
        BACKEND & DISTRIBUTED SYSTEMS &bull; HO CHI MINH CITY
      </p>
    </footer>
  );
}

export default SiteFooter;
