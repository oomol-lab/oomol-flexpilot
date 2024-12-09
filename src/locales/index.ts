import { I18n, Locale } from "val-i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interop = (p: Promise<any>) => p.then((mod) => mod.default || mod);

export const locales: Record<string, Promise<Locale>> = {
  en: interop(import("./en.json")),
  "zh-cn": interop(import("./zh-cn.json")),
};

export const createI18n = async (locale: string) => {
  return I18n.preload(locale, (lang) => locales[lang]);
};

export class I18nManager {
  public static i18n: I18n;

  public static async crate(locale: string) {
    const i18n = await createI18n(locale);
    this.i18n = i18n;
  }
}
