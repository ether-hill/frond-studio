// Fungi Source — the working collection. Real, verified entries: public-domain
// scans (Internet Archive) plus a few modern touchstones, and a wall of the
// finest public-domain plates (self-hosted from Wikimedia Commons). This is the
// seed of the bibliography that gets catalogued and ported into Source Library.

export type FungiBook = {
  title: string;
  author: string;
  year: string;
  note: string;
  rights: "Public domain" | "In copyright";
  source: string; // repository
  url: string; // where to read / view it
};

export const FUNGI_BOOKS: FungiBook[] = [
  { title: "Nova plantarum genera", author: "Pier Antonio Micheli", year: "1729", note: "The pre-Linnaean landmark that founded scientific mycology — first to systematically describe and figure fungi and their reproduction.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/novaplantarvmgen00mich" },
  { title: "Methodus fungorum", author: "Johann Gottlieb Gleditsch", year: "1753", note: "An early method for sorting fungi into genera and species — a step toward fungal taxonomy.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/methodusfungoru00gledgoog" },
  { title: "Fungorum agri Ariminensis historia", author: "Giovanni Antonio Battarra", year: "1755", note: "A finely-engraved regional flora of the Rimini fungi — foundational for Italian mycology.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/bub_gb_NHrSXGRneYsC" },
  { title: "Fungorum qui in Bavaria… icones", author: "Jacob Christian Schäffer", year: "1762–74", note: "Among the earliest fungal works with hand-coloured plates — a classic illustrated Bavarian mycota.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/fungorumquiinbav34schf" },
  { title: "Herbier de la France", author: "Pierre Bulliard", year: "1780–93", note: "One of the earliest colour-printed botanical works — ~380 plates that shaped mycological iconography.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/herbierdelafranc148bull" },
  { title: "An History of Fungusses growing about Halifax", author: "James Bolton", year: "1788–91", note: "The first British book devoted entirely to fungi, with outstanding hand-coloured illustrations.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/historyoffunguss34bolt" },
  { title: "Coloured Figures of English Fungi", author: "James Sowerby", year: "1797–1809", note: "The most celebrated English illustrated mycology — 440 hand-coloured plates separating edible from poisonous.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/colouredfigureso00sowe" },
  { title: "Synopsis methodica fungorum", author: "Christiaan Hendrik Persoon", year: "1801", note: "A foundational nomenclatural starting-point for rusts, smuts and gasteromycetes.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/synopsismethodi00pers" },
  { title: "Systema Mycologicum", author: "Elias Magnus Fries", year: "1821–32", note: "The great nomenclatural starting point — Fries's natural classification still underpins fungal taxonomy.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/systemamycologic01frie" },
  { title: "Scottish Cryptogamic Flora", author: "Robert Kaye Greville", year: "1823–28", note: "360 hand-coloured plates of Scottish fungi and cryptogams, conceived to continue English Botany.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/scottishcryptog03unkngoog" },
  { title: "Naturgetreue Abbildungen… der Schwämme", author: "Julius Vincenz von Krombholz", year: "1831–46", note: "A lavish guide to edible, harmful and suspect mushrooms — 76 colour plates, a landmark of practical mycology.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/mobot31753002807052" },
  { title: "A Treatise on the Esculent Funguses of England", author: "Charles David Badham", year: "1847", note: "The mycophagy classic — the case for eating wild fungi, illustrated with Hussey's plates.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/atreatiseonescu00badhgoog" },
  { title: "Illustrations of British Mycology", author: "Anna Maria Hussey", year: "1847–55", note: "By one of Britain's first female mycologists — 140 hand-coloured lithographs she drew with her sister.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/illustrationsofb00huss" },
  { title: "Outlines of British Fungology", author: "Miles Joseph Berkeley", year: "1860", note: "The first comprehensive systematic handbook of British fungi, by the father of British plant pathology.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/outlinesofbritis00berk_0" },
  { title: "Fungi: Their Nature and Uses", author: "Mordecai Cubitt Cooke", year: "1875", note: "The readable Victorian overview of what fungi are and do — the popular companion to his atlases.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/30181" },
  { title: "Edible and Poisonous Fungi", author: "Worthington G. Smith", year: "1876", note: "Blunt, charming and practical — “I have constantly eaten every species figured…”.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/60561" },
  { title: "Illustrations of British Fungi", author: "Mordecai Cubitt Cooke", year: "1881–91", note: "A monumental 8-volume atlas of 1,100+ colour plates — still a standard iconographic reference.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/illustrationsofb02cookuoft" },
  { title: "British Fungus-Flora", author: "George Massee", year: "1892–95", note: "A four-volume systematic text-book by Kew's principal mycologist and first president of the BMS.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/britishfungusflo01mass" },
  { title: "Our Edible Toadstools and Mushrooms", author: "William Hamilton Gibson", year: "1895", note: "A popular American field guide to thirty native edible species, illustrated by the author-naturalist.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/ouredibletoadsto00gibs" },
  { title: "Student's Hand-book of the Mushrooms of America", author: "Thomas Taylor", year: "1897", note: "An early American identification handbook to edible and poisonous species.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/32982" },
  { title: "Studies of American Fungi", author: "George F. Atkinson", year: "1900", note: "An early, serious use of photography in mycology — a turning point in how fungi were documented.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/studiesofamerica00atki" },
  { title: "One Thousand American Fungi", author: "Charles McIlvaine & R. K. Macadam", year: "1900", note: "A landmark survey of North American edible and poisonous fungi by the fearless taster “Old Ironguts”.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/toadstoolsmushro00mcil" },
  { title: "Among the Mushrooms: A Guide for Beginners", author: "Ellen M. Dallas & Caroline A. Burgin", year: "1900", note: "An approachable beginner's guide to the common edible and poisonous fungi.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/18452" },
  { title: "Führer für Pilzfreunde", author: "Edmund Michael", year: "c. 1901", note: "The enormously popular German field guide, with colour plates that taught a generation of foragers.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/31856" },
  { title: "The Mushroom Book", author: "Nina L. Marshall", year: "1901", note: "An influential illustrated American popular guide that brought mycology to a wide general audience.", rights: "Public domain", source: "Internet Archive", url: "https://archive.org/details/mushroombookpopu00marsrich" },
  { title: "The Mushroom, Edible and Otherwise", author: "Miron Elisha Hard", year: "1908", note: "The most-downloaded of the Gutenberg mycology set — a thorough, photo-illustrated American manual.", rights: "Public domain", source: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/29086" },
  { title: "Mushrooms Demystified", author: "David Arora", year: "1986", note: "The encyclopedic North American field guide to 2,000+ fleshy fungi — the definitive amateur reference.", rights: "In copyright", source: "Internet Archive (borrow)", url: "https://archive.org/details/mushroomsdemysti00aror_0" },
  { title: "Entangled Life", author: "Merlin Sheldrake", year: "2020", note: "The award-winning bestseller that reshaped popular understanding of fungal networks and symbiosis.", rights: "In copyright", source: "Publisher", url: "https://www.penguinrandomhouse.com/books/566795/entangled-life-by-merlin-sheldrake/" },
];

export type FungiPlate = { src: string; caption: string; link: string };

export const FUNGI_PLATES: FungiPlate[] = [
  { src: "/fungi-source/plates/schaeffer-muscaria.jpg", caption: "Schäffer · Fly agaric (Amanita muscaria), 1762–74", link: "https://commons.wikimedia.org/wiki/File:Tab27-Agaricus_muscarius.jpg" },
  { src: "/fungi-source/plates/hussey-clathrus.jpg", caption: "Hussey · Latticed stinkhorn (Clathrus ruber), 1847", link: "https://commons.wikimedia.org/wiki/File:1847_Clathrus_ruber.jpg" },
  { src: "/fungi-source/plates/krombholz-7.jpg", caption: "Krombholz · Boletus regius, Tafel 7, 1831–46", link: "https://commons.wikimedia.org/wiki/File:Krombholz_mykologische_Hefte_Taf._7.jpg" },
  { src: "/fungi-source/plates/sowerby-1.jpg", caption: "Sowerby · Straw mushroom, Tab. 1, 1797", link: "https://commons.wikimedia.org/wiki/File:Coloured_Figures_of_English_Fungi_or_Mushrooms_-_t._1.jpg" },
  { src: "/fungi-source/plates/hussey-coccinea.jpg", caption: "Hussey · Scarlet waxcap (Hygrocybe coccinea), 1847", link: "https://commons.wikimedia.org/wiki/File:1847_Hygrocybe_coccinea.jpg" },
  { src: "/fungi-source/plates/schaeffer-deliciosus.jpg", caption: "Schäffer · Saffron milkcap (Lactarius deliciosus), 1762–74", link: "https://commons.wikimedia.org/wiki/File:Tab11-Agaricus_deliciosus.jpg" },
  { src: "/fungi-source/plates/bulliard-palmatus.jpg", caption: "Bulliard · Rhodotus palmatus, plate 216, 1785", link: "https://commons.wikimedia.org/wiki/File:Bulliard_-_Agaricus_palmatus.png" },
  { src: "/fungi-source/plates/cooke-749.jpg", caption: "Cooke · Cortinarius cotoneus, Pl. 749, 1888", link: "https://commons.wikimedia.org/wiki/File:Cooke-Illustrations_of_British_Fungi-Pl.749.jpg" },
  { src: "/fungi-source/plates/krombholz-37.jpg", caption: "Krombholz · Schwämme, Tafel 37, 1831–46", link: "https://commons.wikimedia.org/wiki/File:Krombholz_mykologische_Hefte_Taf._37.jpg" },
  { src: "/fungi-source/plates/schaeffer-campestris.jpg", caption: "Schäffer · Meadow mushroom (Agaricus campestris), 1762–74", link: "https://commons.wikimedia.org/wiki/File:Tab33-Agaricus_campestris_L.jpg" },
  { src: "/fungi-source/plates/bulliard-sanguineus.jpg", caption: "Bulliard · Russula sanguinea, 1781", link: "https://commons.wikimedia.org/wiki/File:Bulliard_-_Agaricus_sanguineus.png" },
  { src: "/fungi-source/plates/barla-agaricus.jpg", caption: "Barla · Les champignons de la province de Nice, 1859", link: "https://commons.wikimedia.org/wiki/File:BarlaLesChampignonsNiceAgaricus.jpg" },
];
