import Footer from './components/Footer'
import Hero from './components/Hero'
import Nav from './components/Nav'
import Scroll from './components/Scroll'
import Slides from './components/Slides'
import FAQ from './components/FAQ'

export default function App() {
  return (
    <>
      <Scroll />
      <Nav />
      <Hero />
      <Slides />
      <FAQ />
      <Footer />
    </>
  )
}