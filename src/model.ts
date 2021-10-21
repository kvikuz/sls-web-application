export interface Movie {
    id: number,
    type: string,
    original_title: string,
    title?: string,
    original_language?: string,
    release_date?: string,
    poster_path?: string,
    popularity?: number,
    video?: string,
    vote_count?: number,
    vote_average?: number,
    rating?: number,
    genres?: string,
    backdrop_path?: string,
    adult?: string,
    overview?: string,
}

export interface ApiError {
    message: string
}

export interface Vote {
    id?: string,
    user_id: string,
    movie_id: number,
    value: number
}
