import fetch from "node-fetch";
import {Movie} from "./model";
import {saveMovie} from "./repository";
import {PutObjectCommand, PutObjectCommandInput, S3Client} from "@aws-sdk/client-s3";
import {getIamToken, Token} from "./iam";
import {HttpRequest} from "@aws-sdk/protocol-http";

const MOVIES_COUNT = 100;

const s3Client = new S3Client({
    region: "ru-central1",
    endpoint: "https://storage.yandexcloud.net"
});

interface TmdbMovie {
    id: number,
    title: string,
    type: string,
    original_title: string,
    original_language: string,
    release_date: string,
    poster_path: string,
    popularity: number,
    video: boolean,
    vote_count: number,
    vote_average: number,
    genre_ids: number[],
    backdrop_path: string,
    adult: boolean,
    overview: string,
}

interface TmdbGenre {
    id: number;
    name: string;
}

function transform(tmdbMovie: TmdbMovie, genresMap: Map<number, string>): Movie {
    return {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        original_title: tmdbMovie.original_title,
        original_language: tmdbMovie.original_language,
        poster_path: tmdbMovie.poster_path,
        backdrop_path: tmdbMovie.backdrop_path,
        popularity: tmdbMovie.popularity,
        vote_average: tmdbMovie.vote_average / 2,
        vote_count: tmdbMovie.vote_count,
        overview: tmdbMovie.overview,
        release_date: tmdbMovie.release_date,
        genres: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map(genreId => genresMap.get(genreId)).join(", ") : undefined,
        adult: String(tmdbMovie.adult),
        video: String(tmdbMovie.video),
        type: "FILM"
    };
}

export const handler = async (event: any): Promise<any> => {
    const genres: TmdbGenre[] = await (await fetch("https://storage.yandexcloud.net/movies-app/genres.json")).json() as TmdbGenre[];
    const genresMap = new Map(genres.map(genre => [genre.id, genre.name]));
    const tmdbMovies: TmdbMovie[] = await (await fetch("https://storage.yandexcloud.net/movies-app/tmdb.json")).json() as TmdbMovie[];

    for (let i = 0; i < MOVIES_COUNT; i++) {
        let movie = transform(tmdbMovies[i], genresMap);
        await saveMovie(movie)
        await importImage("posters", movie.poster_path?.slice(1))
        await importImage("backdrops", movie.backdrop_path?.slice(1))
    }

    return {
        "statusCode": 200,
        "body": `Imported ${MOVIES_COUNT} movies from TMDB`,
        "isBase64Encoded": false
    }
}

async function importImage(folder: string, file: string | undefined, size: string = "w500") {
    if (!file) return;
    const uploadParams: PutObjectCommandInput = {
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Key: `${folder}/${file}`,
        Body: await (await fetch(`https://image.tmdb.org/t/p/${size}/${file}`)).buffer()
    };

    try {
        await callWithToken(() => s3Client.send(new PutObjectCommand(uploadParams)))
        console.log(`Imported image ${file}`)
    } catch (e) {
        console.error(`Failed to import image ${file}: `, e);
    }
}

function callWithToken(operation: () => Promise<any>): Promise<any> {
    s3Client.middlewareStack.add(
        (next) => async (arguments_) => {
            const request = arguments_.request as HttpRequest;
            const token: Token = await getIamToken();
            request.headers["X-YaCloud-SubjectToken"] = token.access_token;
            return next(arguments_);
        },
        {
            step: "finalizeRequest",
        }
    );
    return operation.apply({});
}
