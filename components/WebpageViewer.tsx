import React from 'react';

interface WebpageViewerProps {
    htmlContent: string;
}

const WebpageViewer: React.FC<WebpageViewerProps> = ({ htmlContent }) => {
    return (
        <div className="w-full h-full flex flex-col">
            <iframe
                srcDoc={htmlContent}
                title="Webpage Preview"
                className="w-full h-full border-2 border-gray-700 rounded-lg bg-white"
                sandbox="allow-scripts"
            />
        </div>
    );
};

export default WebpageViewer;