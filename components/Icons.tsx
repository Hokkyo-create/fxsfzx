// Fix: Implement the Icon component to be a proper module.
import React from 'react';
import type { IconName } from '../types';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
}

const Icon: React.FC<IconProps> = ({ name, ...props }) => {
    const defaultProps = {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
    };

    switch (name) {
        case 'Fire':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-3.797z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75a4.5 4.5 0 004.5-4.5v-1.5a4.5 4.5 0 00-4.5 4.5v1.5z" /></svg>;
        case 'Chart':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-12a2.25 2.25 0 01-2.25-2.25V3.75m14.25 5.25v5.25m-3-5.25v5.25m-3-5.25v5.25m-3-5.25v5.25M3.75 12h16.5" /></svg>;
        case 'Heart':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
        case 'ChevronLeft':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
        case 'Play':
            return <svg {...defaultProps} fill="currentColor" {...props}><path d="M6.32 2.577a.75.75 0 011.06 0l10.5 9.25a.75.75 0 010 1.346l-10.5 9.25a.75.75 0 01-1.06-1.346L15.94 12 6.32 3.923a.75.75 0 010-1.346z" /></svg>;
        case 'Plus':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
        case 'Check':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
        case 'Share':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" /></svg>;
        case 'Dumbbell':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11.083 5.5l.015.004.015.004a.75.75 0 01.03 1.492l-.015-.004-.015-.004a.75.75 0 01-.03-1.492zM12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 2.25zM12.75 6h.008v.008h-.008V6zM11.25 6h.008v.008h-.008V6zM12 6.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM12.015 8.246a.75.75 0 01.03-1.492l-.015.004-.015.004a.75.75 0 01-.03 1.492zM8.25 12h7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 12H3.75v3.75H6V12zm12 0h2.25v3.75H18V12zm-6 7.5h.008v.008H12V19.5zm-3.375-3.375a.75.75 0 011.06 0l-.001.001.001.001a.75.75 0 010 1.06l-1.06-1.06zM15.375 15.375a.75.75 0 010 1.06l-1.06 1.06-1.06-1.06a.75.75 0 010-1.06l1.06 1.06 1.06-1.06zM9.31 16.435a.75.75 0 011.06 1.06l-1.06-1.06zM15.375 16.125a.75.75 0 010-1.06l1.06 1.06-1.06-1.06z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v1.5a.75.75 0 01-.75.75z" /></svg>;
        case 'Wrench':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.664 1.208-.766M11.42 15.17l-4.66-4.66C4.562 8.307 3 9.497 3 11.42c0 1.922 1.562 3.112 3.75 1.488l4.67-4.67M11.42 15.17L15.17 11.42" /></svg>;
        case 'Cart':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.831A1.125 1.125 0 0018.143 8.25h-9.115m-4.012 6.002L7.5 7.25m-4.012 6.002l-2.224-6.353a1.125 1.125 0 01.401-1.329l5.45-3.633A1.125 1.125 0 0110.03 4.25l2.25 1.5m-4.52 4.5l1.543-5.432m5.467 4.5l-1.543-5.432m0 0l-1.543 5.432" /></svg>;
        case 'Dollar':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'Brain':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.47 2.118 2.25 2.25 0 01-2.47-2.118c0-.62.28-1.157.7-1.542M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 110-6 3 3 0 010 6z" /></svg>;
        case 'X':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
        case 'Send':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
        case 'Gear':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995a6.473 6.473 0 010 .255c0 .382.145.755.438.995l1.003.827c.48.398.668 1.05.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995a6.473 6.473 0 010-.255c0-.382-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
        case 'UsersGroup':
            return <svg {...defaultProps} {...props}><path d="M10 6a2 2 0 11-4 0 2 2 0 014 0zM12 6a2 2 0 11-4 0 2 2 0 014 0zM14 6a2 2 0 11-4 0 2 2 0 014 0zM16 8a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 14a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 14a2 2 0 100-4 2 2 0 000 4zM10 16a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 14a2 2 0 100-4 2 2 0 000 4zM14 16a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 14a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 18a2 2 0 100-4 2 2 0 000 4z" /><path d="M10 16a2 2 0 100-4 2 2 0 000 4zM12 18a2 2 0 100-4 2 2 0 000 4zM14 16a2 2 0 100-4 2 2 0 000 4z" /><path d="M12 18a2 2 0 100-4 2 2 0 000 4z" /></svg>;
        case 'Upload':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
        case 'BookOpen':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
        case 'Download':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
        case 'Pencil':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
        case 'Pause':
            return <svg {...defaultProps} fill="currentColor" {...props}><path d="M5.25 6.375a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v11.25a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V6.375zM15.75 6.375a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v11.25a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V6.375z" /></svg>;
        case 'SkipBack':
            return <svg {...defaultProps} fill="currentColor" {...props}><path d="M6.32 2.577a.75.75 0 01.75-.427h2.321a.75.75 0 010 1.5H7.752L17.68 12l-9.928 8.35a.75.75 0 01-1.112-1.004L14.05 12 6.32 3.923a.75.75 0 010-1.346zM4.5 6a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v12a.75.75 0 01-.75.75h-.008A.75.75 0 014.5 18V6z" /></svg>;
        case 'SkipForward':
            return <svg {...defaultProps} fill="currentColor" {...props}><path d="M17.68 2.577a.75.75 0 01.75.427v17.492a.75.75 0 01-1.112 1.004L6.32 12.85A.75.75 0 016.32 11.5l11.36-9.496a.75.75 0 01.427-.427zM19.5 6a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V6.75a.75.75 0 01.75-.75z" /></svg>;
        case 'Trash':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
        case 'Search':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
        case 'Film':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5v7.5h-7.5V6.75zM12 12.75h.008v.008H12v-.008z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h.008v.008H3.75V9zm0 3h.008v.008H3.75v-.008zm0 3h.008v.008H3.75v-.008zm16.5 0h.008v.008h-.008v-.008zm0-3h.008v.008h-.008v-.008zm0-3h.008v.008h-.008V9z" /></svg>;
        case 'Sparkles':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 13.5h.008v.008H16.5v-.008z" /></svg>;
        case 'Info':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
        case 'VolumeUp':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>;
        case 'VolumeOff':
            return <svg {...defaultProps} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>;
        default:
            return null;
    }
}

export default Icon;
