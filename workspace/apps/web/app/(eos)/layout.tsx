import { LocaleProvider } from "@repo/presentation-hooks";
import { DEFAULT_LOCALE } from "@repo/presentation-hooks/use-locale/use-locale.js";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

export default function EOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <LocaleProvider>
        <GlobalNavigation
          productId="default"
          breadcrumbItems={[]}
          auth={undefined}
        >
          {children}
        </GlobalNavigation>
      </LocaleProvider>
    </ThemeProvider>
  );
}