import {getMovieById, getVotes, putVote, updateRating} from "./repository";
import {Vote} from "./model";

interface Event {
    messages: Vote[]
}

const ERROR = {
    "statusCode": 500,
    "body": 'Fail to put vote and recalculate rating',
    "isBase64Encoded": false
};

export const handler = async (event: Event): Promise<any> => {
    try {
        const vote = event.messages[0];
        await putVote({
            id: vote.user_id + "#" + vote.movie_id,
            user_id: vote.user_id,
            movie_id: vote.movie_id,
            value: vote.value
        } as Vote);

        const votes = await getVotes(vote.movie_id);
        if ("message" in votes) {
            return ERROR;
        }
        console.debug(`Loaded ${votes.length} votes for movie ${vote.movie_id}`)

        const movie = await getMovieById(vote.movie_id);
        if (!movie || "message" in movie) {
            return ERROR;
        }

        const sum = votes.reduce((sum, vote) => sum + vote.value, 0);
        let tmdbRating = movie.vote_average ? movie.vote_average : 0;
        const rating = (sum + tmdbRating * 100) / (votes.length + 100);
        console.debug(`Recalculated rating: TMDB rating = ${tmdbRating}, old rating = ${movie.rating}, new rating = ${rating}`);

        await updateRating(movie.id, rating);

        return {
            "statusCode": 200,
            "body": 'Put vote successfully',
            "isBase64Encoded": false
        };
    } catch (e) {
        console.error("Failed to put vote: ", e);
        return ERROR;
    }
}
