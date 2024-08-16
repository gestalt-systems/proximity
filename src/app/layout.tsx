import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "Proximity",
	description: "Coordinated dataflow from MotherDuck to Vega-lite",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
