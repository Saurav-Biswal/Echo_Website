import Link from 'next/link';
export default function NotFound(){return <section className="error-page"><div className="kicker">THAT PAGE ISN’T HERE</div><h1>404</h1><p>The page may have moved, or perhaps it was never saved.</p><Link href="/" className="button">Back to Echo <span>↗</span></Link></section>}
