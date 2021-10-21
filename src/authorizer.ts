import jwksClient from 'jwks-rsa'
import jwt, {JwtPayload} from 'jsonwebtoken';
import util from 'util';

const USER_ROLE = "user";
const ADMIN_ROLE = "admin";

export interface Headers {
    [key: string]: string
}

interface AuthContext {
    userId: string,
    roles: string[]
}

const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10, // Default value
    jwksUri: process.env.JWKS_URI || ""
});

const jwtOptions = {
    audience: process.env.AUDIENCE,
    issuer: process.env.TOKEN_ISSUER
};

function isAdminModification(event: any) {
    return !event.path.endsWith('votes') && (event.httpMethod == "POST" ||
        event.httpMethod == "PUT" ||
        event.httpMethod == "DELETE" ||
        event.httpMethod == "PATCH");
}

export const handler = async (event: any): Promise<any> => {
    console.log(event);

    try {
        const authContext: AuthContext = await authenticate(event?.headers?.Authorization);

        if (event.pathParams && 'userId' in event.pathParams && event.pathParams.userId !== authContext.userId) {
            return {
                isAuthorized: false
            };
        }

        if (!isAdminModification(event)) {
            return authContext.roles.includes(USER_ROLE) ? {
                    isAuthorized: true,
                    context: authContext
                } :
                {
                    isAuthorized: false
                };
        }

        return authContext.roles.includes(ADMIN_ROLE) ?
            {
                isAuthorized: true,
                context: authContext
            } :
            {
                isAuthorized: false
            };

    } catch (e) {
        console.error(e);
        return {
            isAuthorized: false
        }
    }
}

function getToken(authHeader: string) {
    if (!authHeader) {
        throw new Error('Expected "event.authorizationToken" parameter to be set');
    }

    const match = authHeader.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new Error(`Invalid Authorization token - ${authHeader} does not match "Bearer .*"`);
    }
    return match[1];
}

async function authenticate(authHeader: string): Promise<AuthContext> {
    const token = getToken(authHeader);

    const decodedJwt = jwt.decode(token, {complete: true});
    if (!decodedJwt || !decodedJwt.header || !decodedJwt.header.kid) {
        throw new Error('invalid token')
    }

    const getSigningKey = util.promisify(client.getSigningKey);
    const key = await getSigningKey(decodedJwt.header.kid);
    const signingKey = "publicKey" in key ? key.publicKey : "rsaPublicKey" in key ? key.rsaPublicKey : "";

    const jwtPayload: JwtPayload | string = await jwt.verify(token, signingKey, jwtOptions);

    console.log(jwtPayload)

    return {
        userId: jwtPayload.sub || "",
        roles: typeof jwtPayload === "string" ? [] : jwtPayload[process.env.AUDIENCE + "/roles"]
    } as AuthContext;
}
