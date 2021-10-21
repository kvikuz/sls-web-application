import {
    BatchWriteItemCommand,
    BatchWriteItemInput,
    DeleteItemCommand,
    DeleteItemCommandInput,
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    GetItemCommandOutput,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput,
    UpdateItemCommand,
    UpdateItemCommandInput,
    WriteRequest
} from "@aws-sdk/client-dynamodb";
import {marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import {ApiError, Movie, Vote} from "./model";
import {SdkError} from "@aws-sdk/types";
import {getIamToken, Token} from "./iam";
import {HttpRequest} from "@aws-sdk/protocol-http";

const MOVIES_TABLE = "movies";
const VOTES_TABLE = "votes";
const MAX_LIMIT = 100;

const ddbClient = new DynamoDBClient({
    region: "ru-central-1",
    endpoint: process.env.DOCUMENT_API_ENDPOINT
});

export async function saveMovie(movie: Movie): Promise<Movie | ApiError> {
    const params: UpdateItemCommandInput = {
        TableName: MOVIES_TABLE,
        Key: {
            "id": {
                "N": movie.id.toString()
            }
        },
        UpdateExpression: "SET " +
            "type = :type, " +
            "original_title = :original_title, " +
            "title = :title, " +
            "original_language = :original_language, " +
            "release_date = :release_date," +
            "poster_path = :poster_path," +
            "popularity = :popularity, " +
            "video = :video, " +
            "vote_count = :vote_count, " +
            "vote_average = :vote_average, " +
            "genres = :genres, " +
            "backdrop_path = :backdrop_path, " +
            "adult = :adult, " +
            "overview = :overview",
        ExpressionAttributeValues: {
            ":type": {"S": movie.type},
            ":original_title": {"S": movie.original_title},
            ":title": {"S": movie.title || ""},
            ":original_language": {"S": movie.original_language || ""},
            ":release_date": {"S": movie.release_date || ""},
            ":poster_path": {"S": movie.poster_path || ""},
            ":popularity": {"N": movie.popularity?.toString() || "0"},
            ":video": {"S": movie.video || ""},
            ":vote_count": {"N": movie.vote_count?.toString() || "0"},
            ":vote_average": {"N": movie.vote_average?.toString() || "0"},
            ":genres": {"S": movie.genres || ""},
            ":backdrop_path": {"S": movie.backdrop_path || ""},
            ":adult": {"S": movie.adult || ""},
            ":overview": {"S": movie.overview || ""},
        }
    };

    console.debug("Save movie...");
    try {
        await callWithToken(() => ddbClient.send(new UpdateItemCommand(params)));
        console.debug(`Save movie id=${movie.id}, title=${movie.title}`);
        return movie;
    } catch (e) {
        console.error("Failed to save movie: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function batchWriteMovies(movies: Movie[]): Promise<number | ApiError> {
    const requests: WriteRequest[] = movies.map(movie => {
        return {
            PutRequest: {
                Item: marshall(movie)
            }
        } as WriteRequest
    });

    const params: BatchWriteItemInput = {
        RequestItems: {
            "movies": requests
        }
    };

    try {
        await callWithToken(() => ddbClient.send(new BatchWriteItemCommand(params)));
        console.debug(`Wrote ${movies.length} movies`);
        return movies.length;
    } catch (e) {
        console.error("Failed to write movies: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getMovieById(id: number): Promise<Movie | undefined | ApiError> {
    const params: GetItemCommandInput = {
        TableName: MOVIES_TABLE,
        Key: marshall({"id": id}),

    };

    try {
        const result: GetItemCommandOutput = await callWithToken(() => ddbClient.send(new GetItemCommand(params)));
        return result.Item ? unmarshall(result.Item) as Movie : undefined;
    } catch (e) {
        console.error(e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function deleteMovieById(id: number): Promise<number | ApiError> {
    const params: DeleteItemCommandInput = {
        TableName: MOVIES_TABLE,
        Key: marshall({"id": id})
    };

    try {
        await callWithToken(() => ddbClient.send(new DeleteItemCommand(params)));
        console.debug(`Deleted movie id=${id}.`);
        return id;
    } catch (e) {
        console.error(`Failed to delete movie id=${id}: `, e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getMovies(limit?: number): Promise<Movie[] | ApiError> {
    const params: QueryCommandInput = {
        TableName: MOVIES_TABLE,
        Limit: !limit || (limit > MAX_LIMIT) ? MAX_LIMIT : limit,
        IndexName: "PopularityIndex",
        KeyConditionExpression: "#t = :type AND #p > :popularity",
        ExpressionAttributeNames: {"#t": "type", "#p": "popularity"},
        ExpressionAttributeValues: {
            ":type": {
                S: "FILM"
            },
            ":popularity": {
                N: "0"
            }
        },
        ScanIndexForward: false
    };

    try {
        const result: QueryCommandOutput = await callWithToken(() => ddbClient.send(new QueryCommand(params)));
        return result.Items ? result.Items.map(value => unmarshall(value) as Movie) : [];
    } catch (e) {
        console.error("Failed to get movies: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function putVote(vote: Vote): Promise<Vote | ApiError> {
    const item = marshall(vote);
    const params: PutItemCommandInput = {
        TableName: VOTES_TABLE,
        Item: item
    };

    console.debug("Adding a new vote...");
    try {
        await callWithToken(() => ddbClient.send(new PutItemCommand(params)));
        console.debug(`Added new vote with user_id=${vote.user_id}, movie_id=${vote.movie_id}, value=${vote.value}`);
        return vote;
    } catch (e) {
        console.error("Failed to add new vote: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getVote(userId: string, movieId: number): Promise<Vote | undefined | ApiError> {
    const params: GetItemCommandInput = {
        TableName: VOTES_TABLE,
        Key: marshall({"id": userId + "#" + movieId}),

    };

    try {
        const result: GetItemCommandOutput = await callWithToken(() => ddbClient.send(new GetItemCommand(params)));
        return result.Item ? unmarshall(result.Item) as Vote : undefined;
    } catch (e) {
        console.error(e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getVotes(movieId: number): Promise<Vote[] | ApiError> {
    const params: QueryCommandInput = {
        TableName: VOTES_TABLE,
        IndexName: "MovieIndex",
        KeyConditionExpression: "#m = :movie_id",
        ExpressionAttributeNames: {"#m": "movie_id"},
        ExpressionAttributeValues: {
            ":movie_id": {
                N: movieId.toString()
            }
        }
    };

    try {
        console.error(`Get votes for movie ${movieId} ...`);
        const result: QueryCommandOutput = await callWithToken(() => ddbClient.send(new QueryCommand(params)));
        return result.Items ? result.Items.map(value => unmarshall(value) as Vote) : [];
    } catch (e) {
        console.error(`Failed to get votes for movie ${movieId}: `, e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function updateRating(movieId: number, rating: number): Promise<number | ApiError> {
    const params: UpdateItemCommandInput = {
        TableName: MOVIES_TABLE,
        Key: {
            "id": {
                "N": movieId.toString()
            }
        },
        UpdateExpression: "SET rating = :rating",
        ExpressionAttributeValues: {
            ":rating": {"N": rating.toString() || "0"},
        }
    };

    try {
        await callWithToken(() => ddbClient.send(new UpdateItemCommand(params)));
        console.debug(`Updated rating for movie id = ${movieId}, new rating = ${rating}`);
        return rating;
    } catch (e) {
        console.error("Failed to update rating: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

function callWithToken(operation: () => Promise<any>): Promise<any> {
    ddbClient.middlewareStack.add(
        (next) => async (arguments_) => {
            const request = arguments_.request as HttpRequest;
            const token: Token = await getIamToken();
            request.headers["Authorization"] = "Bearer " + token.access_token;
            return next(arguments_);
        },
        {
            step: "finalizeRequest",
        }
    );
    return operation.apply({});
}
