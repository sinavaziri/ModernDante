import { notFound } from 'next/navigation';
import { getCanto, getAllCanticas, getAllCantos, getCanticaInfo, type Cantica } from '@/lib/cantos';
import Navigation from '@/components/Navigation';
import CantoSelector from '@/components/CantoSelector';
import CantoDisplay from '@/components/CantoDisplay';

interface PageProps {
  params: Promise<{
    cantica: string;
    canto: string;
  }>;
}

// Generate static params for all cantos
export async function generateStaticParams() {
  const canticas = getAllCanticas();
  const params: { cantica: string; canto: string }[] = [];

  canticas.forEach((canticaInfo) => {
    const cantos = getAllCantos(canticaInfo.name);
    cantos.forEach((canto) => {
      params.push({
        cantica: canticaInfo.name,
        canto: canto.number.toString(),
      });
    });
  });

  return params;
}

export default async function CantoPage({ params }: PageProps) {
  const { cantica: canticaParam, canto: cantoParam } = await params;
  const cantica = canticaParam as Cantica;
  const cantoNumber = parseInt(cantoParam);

  // Validate cantica
  const canticaInfo = getCanticaInfo(cantica);
  if (!canticaInfo) {
    notFound();
  }

  // Get canto data
  const canto = getCanto(cantica, cantoNumber);
  if (!canto) {
    notFound();
  }

  return (
    <>
      <Navigation cantica={cantica} cantoNumber={cantoNumber} />
      <CantoSelector currentCantica={cantica} currentCanto={cantoNumber} />
      <CantoDisplay canto={canto} canticaName={canticaInfo.displayName} />
    </>
  );
}

// Generate metadata for each page
export async function generateMetadata({ params }: PageProps) {
  const { cantica: canticaParam, canto: cantoParam } = await params;
  const cantica = canticaParam as Cantica;
  const cantoNumber = parseInt(cantoParam);

  const canticaInfo = getCanticaInfo(cantica);
  const canto = getCanto(cantica, cantoNumber);

  if (!canto || !canticaInfo) {
    return { title: 'Not Found' };
  }

  return {
    title: `${canticaInfo.displayName} - ${canto.title} | The Divine Comedy`,
    description: `Read ${canticaInfo.displayName} ${canto.title} with modern English translation`,
  };
}
