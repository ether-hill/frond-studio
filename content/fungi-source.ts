// Fungi Source — the working collection. Every book is a real, verified
// public-domain scan on the Internet Archive (full downloads available; links
// checked) with a self-hosted cover, plus a wall of the finest public-domain
// plates from Wikimedia Commons. This is the seed of the open database that gets
// translated, catalogued and ported into Source Library.

export type FungiBook = {
  title: string;
  author: string;
  year: string;
  language: string;
  note: string;
  rights: "Public domain";
  source: string;
  url: string; // full book — Internet Archive
  image: string; // self-hosted cover
};

const ia = (id: string) => `https://archive.org/details/${id}`;
const cover = (id: string) => `/fungi-source/covers/${id}.jpg`;

export const FUNGI_BOOKS: FungiBook[] = [
  { title: "Nova plantarum genera", author: "Pier Antonio Micheli", year: "1729", language: "Latin", note: "The pre-Linnaean landmark that founded scientific mycology.", rights: "Public domain", source: "Internet Archive", url: ia("novaplantarvmgen00mich"), image: cover("novaplantarvmgen00mich") },
  { title: "Fungorum qui in Bavaria… icones", author: "Jacob Christian Schäffer", year: "1762–74", language: "Latin", note: "Among the earliest fungal works with hand-coloured plates.", rights: "Public domain", source: "Internet Archive", url: ia("fungorumquiinbav34schf"), image: cover("fungorumquiinbav34schf") },
  { title: "Histoire des champignons de la France", author: "Pierre Bulliard", year: "1791–1812", language: "French", note: "One of the earliest colour-printed botanical works — a foundational illustrated treatise.", rights: "Public domain", source: "Internet Archive", url: ia("b30454694"), image: cover("b30454694") },
  { title: "Coloured Figures of English Fungi", author: "James Sowerby", year: "1797–1809", language: "English", note: "The most celebrated English illustrated mycology — 440 hand-coloured plates.", rights: "Public domain", source: "Internet Archive", url: ia("colouredfigureso00sowe"), image: cover("colouredfigureso00sowe") },
  { title: "Synopsis Methodica Fungorum", author: "Christiaan Hendrik Persoon", year: "1801", language: "Latin", note: "A nomenclatural bedrock for rusts, smuts and gasteromycetes.", rights: "Public domain", source: "Internet Archive", url: ia("synopsismethodi00pers"), image: cover("synopsismethodi00pers") },
  { title: "Conspectus Fungorum in Lusatiae superioris", author: "Albertini & Schweinitz", year: "1805", language: "Latin", note: "An early systematic landmark of central-European fungi.", rights: "Public domain", source: "Internet Archive", url: ia("conspectusfungor00albe"), image: cover("conspectusfungor00albe") },
  { title: "Systema Mycologicum", author: "Elias Magnus Fries", year: "1821–32", language: "Latin", note: "The great nomenclatural starting point of fungal taxonomy.", rights: "Public domain", source: "Internet Archive", url: ia("systemamycologic01frie"), image: cover("systemamycologic01frie") },
  { title: "Naturgetreue Abbildungen… der Schwämme", author: "J. V. von Krombholz", year: "1831–46", language: "German", note: "A lavish guide to edible, harmful and suspect mushrooms — 76 colour plates.", rights: "Public domain", source: "Internet Archive", url: ia("mobot31753002807052"), image: cover("mobot31753002807052") },
  { title: "Funghi d'Italia", author: "Domenico Viviani", year: "1834", language: "Italian", note: "Sixty colour plates of the fungi of Italy.", rights: "Public domain", source: "Internet Archive", url: ia("TO01052542"), image: cover("TO01052542") },
  { title: "Descrizione dei funghi mangerecci… dell'Italia", author: "Carlo Vittadini", year: "1835", language: "Italian", note: "Forty-four colour plates of the common edible fungi of Italy.", rights: "Public domain", source: "Internet Archive", url: ia("descrizionedeifu00vitt"), image: cover("descrizionedeifu00vitt") },
  { title: "A Treatise on the Esculent Funguses of England", author: "Charles David Badham", year: "1847", language: "English", note: "The mycophagy classic, illustrated with Hussey's plates.", rights: "Public domain", source: "Internet Archive", url: ia("treatiseonescule00badh_0"), image: cover("treatiseonescule00badh_0") },
  { title: "Illustrations of British Mycology", author: "Anna Maria Hussey", year: "1847–55", language: "English", note: "140 hand-coloured lithographs by one of Britain's first female mycologists.", rights: "Public domain", source: "Internet Archive", url: ia("illustrationsofbser01huss"), image: cover("illustrationsofbser01huss") },
  { title: "Sveriges ätliga och giftiga svampar", author: "Elias Magnus Fries", year: "1862–69", language: "Swedish", note: "Ninety-three colour plates of Sweden's edible and poisonous fungi.", rights: "Public domain", source: "Internet Archive", url: ia("sverigesatligaoc1861frie"), image: cover("sverigesatligaoc1861frie") },
  { title: "Rambles in Search of Flowerless Plants", author: "Margaret Plues", year: "1864", language: "English", note: "Field narrative blended with hand-coloured lithographs.", rights: "Public domain", source: "Internet Archive", url: ia("ramblesinsearcho00plue"), image: cover("ramblesinsearcho00plue") },
  { title: "Rust, Smut, Mildew & Mould", author: "Mordecai Cubitt Cooke", year: "1865", language: "English", note: "The go-to early introduction to the microscopic fungi.", rights: "Public domain", source: "Internet Archive", url: ia("rustsmutmildewmo00cook"), image: cover("rustsmutmildewmo00cook") },
  { title: "Morphologie und Physiologie der Pilze", author: "Anton de Bary", year: "1866", language: "German", note: "Foundational science — the morphology and physiology of the fungi.", rights: "Public domain", source: "Internet Archive", url: ia("beitragezurmorph45bary"), image: cover("beitragezurmorph45bary") },
  { title: "Handbook of British Fungi", author: "Mordecai Cubitt Cooke", year: "1871", language: "English", note: "The systematic handbook of British fungi.", rights: "Public domain", source: "Internet Archive", url: ia("handbookofbritis01cook"), image: cover("handbookofbritis01cook") },
  { title: "Les Hyménomycètes", author: "Claude-Casimir Gillet", year: "1874–98", language: "French", note: "A descriptive flora of the hymenomycetes of France.", rights: "Public domain", source: "Internet Archive", url: ia("leschampignonsfu01gill"), image: cover("leschampignonsfu01gill") },
  { title: "Fungi: Their Nature and Uses", author: "Mordecai Cubitt Cooke", year: "1875", language: "English", note: "The readable Victorian overview of what fungi are and do.", rights: "Public domain", source: "Internet Archive", url: ia("fungitheirnature00cookrich"), image: cover("fungitheirnature00cookrich") },
  { title: "Edible and Poisonous Fungi", author: "Worthington G. Smith", year: "1876", language: "English", note: "Blunt, charming and practical — “I have constantly eaten every species figured…”.", rights: "Public domain", source: "Internet Archive", url: ia("b28057971"), image: cover("b28057971") },
  { title: "Illustrations of British Fungi", author: "Mordecai Cubitt Cooke", year: "1881–91", language: "English", note: "A monumental 8-volume atlas of 1,100+ colour plates.", rights: "Public domain", source: "Internet Archive", url: ia("illustrationsofb02cook"), image: cover("illustrationsofb02cook") },
  { title: "Sylloge Fungorum", author: "Pier Andrea Saccardo", year: "1882–", language: "Latin", note: "The vast catalogue gathering every described fungus into one work.", rights: "Public domain", source: "Internet Archive", url: ia("syllogefungorumo05sacc"), image: cover("syllogefungorumo05sacc") },
  { title: "Vergleichende Morphologie und Biologie der Pilze", author: "Anton de Bary", year: "1884", language: "German", note: "Comparative morphology and biology of the fungi — a science classic.", rights: "Public domain", source: "Internet Archive", url: ia("vergleichendemor00bary"), image: cover("vergleichendemor00bary") },
  { title: "Our Edible Toadstools and Mushrooms", author: "W. Hamilton Gibson", year: "1895", language: "English", note: "Exquisite author-drawn plates of thirty edible species.", rights: "Public domain", source: "Internet Archive", url: ia("cu31924002064842"), image: cover("cu31924002064842") },
  { title: "Student's Hand-book of the Mushrooms of America", author: "Thomas Taylor", year: "1897", language: "English", note: "An early American identification handbook.", rights: "Public domain", source: "Internet Archive", url: ia("studentshandbook00tayl"), image: cover("studentshandbook00tayl") },
  { title: "I funghi mangerecci e velenosi", author: "Giacomo Bresadola", year: "1899", language: "Italian", note: "The edible and poisonous fungi of central Europe — ~120 colour plates.", rights: "Public domain", source: "Internet Archive", url: ia("ifunghimangerecce00bres"), image: cover("ifunghimangerecce00bres") },
  { title: "Studies of American Fungi", author: "George F. Atkinson", year: "1900", language: "English", note: "An early, serious use of photography in mycology.", rights: "Public domain", source: "Internet Archive", url: ia("studiesofamerica00atki"), image: cover("studiesofamerica00atki") },
  { title: "One Thousand American Fungi", author: "Charles McIlvaine", year: "1900", language: "English", note: "The 700-page survey by the fearless taster “Old Ironguts”.", rights: "Public domain", source: "Internet Archive", url: ia("toadstoolsmushro00mcil"), image: cover("toadstoolsmushro00mcil") },
  { title: "Among the Mushrooms: A Guide for Beginners", author: "Dallas & Burgin", year: "1900", language: "English", note: "An approachable beginner's guide to common fungi.", rights: "Public domain", source: "Internet Archive", url: ia("amongmushroomsgu00dall"), image: cover("amongmushroomsgu00dall") },
  { title: "Führer für Pilzfreunde", author: "Edmund Michael", year: "c. 1901", language: "German", note: "The enormously popular German field guide, with colour plates.", rights: "Public domain", source: "Internet Archive", url: ia("fhrerfrpilzfreun00mich"), image: cover("fhrerfrpilzfreun00mich") },
  { title: "The Mushroom Book", author: "Nina L. Marshall", year: "1901", language: "English", note: "A beautifully produced American popular guide.", rights: "Public domain", source: "Internet Archive", url: ia("mushroombookpopu00marsrich"), image: cover("mushroombookpopu00marsrich") },
  { title: "Icones mycologicae", author: "Émile Boudier", year: "1905–10", language: "French", note: "Some six hundred exquisite colour plates of European fungi.", rights: "Public domain", source: "Internet Archive", url: ia("iconesmycologic02boud"), image: cover("iconesmycologic02boud") },
  { title: "A Text-book of Fungi", author: "George Massee", year: "1906", language: "English", note: "A systematic text-book — morphology, physiology and classification.", rights: "Public domain", source: "Internet Archive", url: ia("textbookoffungii00massuoft"), image: cover("textbookoffungii00massuoft") },
  { title: "The Mushroom, Edible and Otherwise", author: "Miron Elisha Hard", year: "1908", language: "English", note: "A thorough, photo-illustrated American manual.", rights: "Public domain", source: "Internet Archive", url: ia("mushroomedibleot00harduoft"), image: cover("mushroomedibleot00harduoft") },
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
