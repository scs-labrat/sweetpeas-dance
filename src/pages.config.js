import Home from './pages/Home';
import Admin from './pages/Admin';
import Family from './pages/Family';
import Blog from './pages/Blog';
import Promo from './pages/Promo';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Admin": Admin,
    "Family": Family,
    "Blog": Blog,
    "Promo": Promo,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};