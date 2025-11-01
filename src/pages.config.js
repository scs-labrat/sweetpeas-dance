import Home from './pages/Home';
import Admin from './pages/Admin';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Admin": Admin,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};