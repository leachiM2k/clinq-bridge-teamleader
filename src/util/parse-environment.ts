export interface IOAuth2Options {
	TEAMLEADER_CLIENT_ID: string;
	TEAMLEADER_CLIENT_SECRET: string;
	TEAMLEADER_REDIRECT_URL: string;
}

export default function parseEnvironment(): IOAuth2Options {
	const { TEAMLEADER_CLIENT_ID, TEAMLEADER_CLIENT_SECRET, TEAMLEADER_REDIRECT_URL } = process.env;

	if (!TEAMLEADER_CLIENT_ID) {
		throw new Error("Missing client ID in environment.");
	}

	if (!TEAMLEADER_CLIENT_SECRET) {
		throw new Error("Missing client secret in environment.");
	}

	if (!TEAMLEADER_REDIRECT_URL) {
		throw new Error("Missing redirect url in environment.");
	}

	return {
		TEAMLEADER_CLIENT_ID,
		TEAMLEADER_CLIENT_SECRET,
		TEAMLEADER_REDIRECT_URL
	};
}
