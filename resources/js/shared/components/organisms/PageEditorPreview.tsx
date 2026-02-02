import React from 'react';
import { Render, Config, Data } from "@puckeditor/core";
import { Button } from "@/shared/components/ui/button";
import { Edit, ExternalLink } from "lucide-react";

interface PageEditorPreviewProps {
  children: React.ReactNode;
  headerData?: Data | null;
  footerData?: Data | null;
  config: Config;
  onEditSection?: (section: 'header' | 'footer') => void;
}

export function PageEditorPreview({
  children,
  headerData,
  footerData,
  config,
  onEditSection
}: PageEditorPreviewProps) {

  // Only show header if we have data for it
  const showHeader = !!headerData && Object.keys(headerData).length > 0;

  // Only show footer if we have data for it
  const showFooter = !!footerData && Object.keys(footerData).length > 0;

  const renderEditOverlay = (label: string, section: 'header' | 'footer') => {
    if (!onEditSection) return null;

    return (
      <div className="absolute inset-0 bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-center group z-10 border-y-2 border-transparent hover:border-blue-500/30">
        <Button
          variant="secondary"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onEditSection(section);
          }}
        >
          <Edit className="w-3 h-3 mr-2" />
          Edit {label} in Customizer
          <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
        </Button>
      </div>
    );
  };

  return (
    <>
      {showHeader && (
        <div
          className="page-editor-preview__header"
          style={{
            position: 'relative',
            pointerEvents: 'none', // Allow clicks to pass through to overlay but restrict interaction
            borderBottom: '2px dashed #e5e7eb',
          }}
        >
          {/* Re-enable pointer events for the overlay button */}
          <div style={{ pointerEvents: 'auto' }}>
            {renderEditOverlay('Header', 'header')}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              fontSize: '10px',
              color: '#9ca3af',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '2px 6px',
              borderRadius: '4px',
              zIndex: 10,
              border: '1px solid #e5e7eb',
            }}
          >
            Header (from Theme)
          </div>
          <Render config={config} data={headerData as Data} />
        </div>
      )}

      {children}

      {showFooter && (
        <div
          className="page-editor-preview__footer"
          style={{
            position: 'relative',
            pointerEvents: 'none',
            borderTop: '2px dashed #e5e7eb',
          }}
        >
           {/* Re-enable pointer events for the overlay button */}
           <div style={{ pointerEvents: 'auto' }}>
            {renderEditOverlay('Footer', 'footer')}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              fontSize: '10px',
              color: '#9ca3af',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '2px 6px',
              borderRadius: '4px',
              zIndex: 10,
              border: '1px solid #e5e7eb',
            }}
          >
            Footer (from Theme)
          </div>
          <Render config={config} data={footerData as Data} />
        </div>
      )}
    </>
  );
}
