import fetch from "node-fetch";

let GET_TOKEN_URL = 'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token';

export interface Token {
    access_token: string
}

export async function getIamToken(): Promise<Token> {
    const resp = await fetch(GET_TOKEN_URL, {
        headers: {'Metadata-Flavor': 'Google'},
    });

    return await resp.json() as Token;
}
