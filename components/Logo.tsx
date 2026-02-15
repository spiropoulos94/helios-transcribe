import Image from 'next/image';

interface LogoProps {
  width: number;
}

export default function Logo({ width = 200 }: LogoProps = { width: 200 }) {
  const height = width; // Keep it square

  return (
    <div
      className="bg-blue-600 flex items-center justify-center rounded-sm"
      style={{ width: `${width}px`, height: `${width/3}px` }}
    >
      <Image
        src="/logo/grecho-logo-transparent.svg"
        alt="Grecho Logo"
        width={width } // Slightly smaller than container for padding
        height={height }
        priority
      />
    </div>
  );
}
