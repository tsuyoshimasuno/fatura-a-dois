import { Nav } from './_components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="app-content">{children}</div>
    </>
  );
}
