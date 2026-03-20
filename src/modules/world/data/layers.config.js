const full = {
	name: "World",
	type: "world",
	children: [
		{
			name: "Building Projects",
			type: "georeferenced",
			path: "World/Buildings",
			children: [

				{
					name: "AECO Structure",
					type: "georeferenced",
					path: "World/Buildings/AECO_Structure",
					references: {
						usd: "AECO_World/Built_Environment/Building_Projects/strucres.usd",
					},
				},
				{
					name: "MEP",
					type: "georeferenced",
					path: "World/Buildings/MEP",
				},
			],
		},
		{
			name: "Natural Environment",
			type: "layer",
			path: "World/NaturalEnvironment",
		},
		{
			name: "Infrastructure Projects",
			type: "georeferenced",
			path: "World/Infrastructure",
		},
		{
			name: "Logistics Projects",
			type: "layer",
			path: "World/Logistics",
			children: [
				{
					name: "Construction Resources",
					type: "layer",
					references: {
						usd: "AECO_World/Logistics/Construction_Resources.usd",
					},
				},
			],
		},
	],
};

export const WorldStructure = {

	full,
};