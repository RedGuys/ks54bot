export default class KioskBase {
    constructor(conString: string);
    getOPs(): Promise<OP[]>;
    getScheduleCalls(op: number): Promise<ScheduleCall[]>;
}

export class ScheduleCall {
    op_number: number;
    pair_number: number;
    first_start: string;
    first_end: string;
    second_start: string;
    second_end: string;
}

export class OP {
    "op_number": number;
    "all_count": number;
    "tv_count": number;
    "op_number_api": number;
    "op_name": string;
    "invert_shedule": string;
    "games": string;
    "shedule": string;
    "banners": string;
    "extra": string;
    "music": string;
    "hokkey_count": number;
    "dining_table_count": number;
    "inventory_cab": number;
    "contact_views": number;
    "studsovet_views": number;
    "news_autoload": string;
    "dublicate_timetable": number;
}