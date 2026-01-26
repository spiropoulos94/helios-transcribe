import type { Locale } from './config';
import en from './dictionaries/en.json';
import el from './dictionaries/el.json';

const dictionaries = {
  en: () => Promise.resolve(en),
  el: () => Promise.resolve(el),
};

export const getDictionary = async (locale: Locale) => dictionaries[locale]();
