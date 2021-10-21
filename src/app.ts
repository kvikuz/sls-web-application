import path from 'path';
import OpenAPIBackend, {Request} from 'openapi-backend';
import express from 'express';
import morgan from 'morgan';

import {Request as ExpressReq, Response as ExpressRes} from 'express';
import {deleteMovieById, getMovieById, getMovies, getVote, saveMovie} from "./repository";
import {ApiError} from "./model";

const app = express();
app.use(express.json());

// define api
const api = new OpenAPIBackend({
    definition: path.join(__dirname, '..', 'openapi', 'api.yaml'),
    quick: true,
    validate: true,
    handlers: {
        getMovies: async (c, req: ExpressReq, res: ExpressRes) => transform(res, getMovies(parseInt(stringOrLast(c.request.params["limit"])))),
        postMovie: async (c, req: ExpressReq, res: ExpressRes) => transform(res, saveMovie(req.body)),
        getMovieById: async (c, req: ExpressReq, res: ExpressRes) => transform(res, getMovieById(parseInt(stringOrLast(c.request.params["id"])))),
        deleteMovieById: async (c, req: ExpressReq, res: ExpressRes) => transform(res, deleteMovieById(parseInt(stringOrLast(c.request.params["id"])))),
        getVote: async (c, req: ExpressReq, res: ExpressRes) => transform(res, getVote(stringOrLast(c.request.params["userId"]), parseInt(stringOrLast(c.request.query["movieId"])))),
        validationFail: async (c, req: ExpressReq, res: ExpressRes) => res.status(400).json({message: c.validation.errors}),
        notFound: async (c, req: ExpressReq, res: ExpressRes) => res.status(404).json({message: 'not found'}),
        notImplemented: async (c, req: ExpressReq, res: ExpressRes) => {
            const {status, mock} = c.api.mockResponseForOperation(c.operation.operationId || "unknown");
            return res.status(status).json(mock);
        },
    },
});
api.init();

// logging
app.use(morgan('combined'));

// use as express middleware
app.use((req, res) => api.handleRequest(req as Request, req, res));

// start server
app.listen(process.env.PORT || 8080, () => console.info(`movies-api listening at http://localhost:${process.env.PORT || 8080}`));

function stringOrLast(data: string | string[]): string {
    return Array.isArray(data) ? data[data.length - 1] : data
}

async function transform(res: ExpressRes, data: Promise<any | ApiError>): Promise<ExpressRes> {
    const result = await data;
    if (!result) {
        return res.status(404).json({message: "Not found"});
    } else if (typeof result === 'object' && "message" in result) {
        return res.status(500).json(result)
    }
    return res.status(200).json(result)
}
