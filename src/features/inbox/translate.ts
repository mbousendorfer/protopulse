// Nova reads every language and shows Sam the English. Mocked: a table of the foreign-language texts in the data.

export type Translation = { lang: string; en: string }

const T: Record<string, Translation> = {
  // German
  'Gilt die Garantie auch in Deutschland?': { lang: 'German', en: 'Is the warranty valid in Germany too?' },
  'Ja, Jonas! Die lebenslange Garantie auf die Summit Bottle gilt überall, auch in Deutschland.': { lang: 'German', en: 'Yes, Jonas! The lifetime warranty on the Summit Bottle applies everywhere, Germany included.' },
  'Gilt die lebenslange Garantie auch für den Rucksack? Ich wohne in Österreich.': { lang: 'German', en: 'Does the lifetime warranty also cover the backpack? I live in Austria.' },
  'Ja, Lena! Die lebenslange Garantie gilt auch für den Ridge, überall in Europa.': { lang: 'German', en: 'Yes, Lena! The lifetime warranty also covers the Ridge, everywhere in Europe.' },
  'Danke, Lena! Die lebenslange Garantie gilt für die Summit Bottle. Für den Ridge gibt es 5 Jahre Garantie und unser Reparaturprogramm, auch in Österreich.': { lang: 'German', en: 'Thanks, Lena! The lifetime warranty covers the Summit Bottle. The Ridge has a 5-year warranty and our repair programme, in Austria too.' },
  // French
  'Il existe en bleu, le Ridge ?': { lang: 'French', en: 'Does the Ridge come in blue?' },
  'Pas encore, Margaux : Moss, Ember, Slate et Glacier. Glacier est le plus proche du bleu, il revient le 8 décembre.': { lang: 'French', en: 'Not yet, Margaux: Moss, Ember, Slate and Glacier. Glacier is the closest to blue, it’s back on 8 December.' },
  // Spanish
  '¿Envían a Canarias?': { lang: 'Spanish', en: 'Do you ship to the Canary Islands?' },
  'Sí, Javier. El envío a Canarias tarda de 5 a 7 días laborables y los impuestos se pagan a la entrega.': { lang: 'Spanish', en: 'Yes, Javier. Shipping to the Canary Islands takes 5 to 7 working days and taxes are paid on delivery.' },
  // Italian
  'Quanto pesa la Storm Jacket in taglia M?': { lang: 'Italian', en: 'How much does the Storm Jacket weigh in size M?' },
  'Ciao Giulia! In taglia M pesa 340 g, e si ripiega nella sua tasca.': { lang: 'Italian', en: 'Hi Giulia! In size M it weighs 340 g, and it packs into its own pocket.' },
}

/** The English of a foreign-language text, if it is one. */
export const translate = (text: string): Translation | undefined => T[text.trim()]
