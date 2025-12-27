import { HeartIcon } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-border bg-black no-print">
      <div className="md:max-w-[95vw] mx-auto px-4 py-4 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-col sm:flex-row">
          <img src="/logo/small.png" alt="St. Helen's" className="h-8 w-8 " />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">© {year} - St. Helen&apos;s Secondary School, Kurseong</span>
          </div>
        </div>

        <div className="font-medium text-md text-muted-foreground">
          <span>Built with <HeartIcon className="inline-block h-4 w-4 " /> by </span>
          <a
            href="https://www.weblyx.site/"
            target="_blank"
            rel="noopener noreferrer"
 className='text-muted-foreground transition-colors duration-200 ease-in-out hover:text-white'            aria-label="Weblyx website (opens in new tab)"
          >
            Weblyx.
          </a>
        </div>
      </div>
    </footer>
  );
}
