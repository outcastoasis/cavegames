param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "../public/icons/notification-badge.png")
)

Add-Type -AssemblyName System.Drawing

$size = 192
$renderScale = 4
$renderSize = $size * $renderScale
$bitmap = New-Object System.Drawing.Bitmap(
  $renderSize,
  $renderSize,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.ScaleTransform($renderScale, $renderScale)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$cave = New-Object System.Drawing.Drawing2D.GraphicsPath(
  [System.Drawing.Drawing2D.FillMode]::Alternate
)

# Breite Höhlensilhouette mit einer grossen, klaren Öffnung.
$cave.StartFigure()
$cave.AddBezier(18, 166, 18, 94, 50, 30, 96, 24)
$cave.AddBezier(96, 24, 142, 30, 174, 94, 174, 166)
$cave.AddLine(174, 166, 140, 166)
$cave.AddBezier(140, 166, 140, 112, 121, 73, 96, 70)
$cave.AddBezier(96, 70, 71, 73, 52, 112, 52, 166)
$cave.AddLine(52, 166, 18, 166)
$cave.CloseFigure()
$graphics.FillPath($whiteBrush, $cave)

# Reduzierte Spielfigur; bewusst ohne feine Details für 24-px-Darstellung.
$graphics.FillEllipse($whiteBrush, 83, 85, 26, 26)
$meeple = New-Object System.Drawing.Drawing2D.GraphicsPath
$meeple.StartFigure()
$meeple.AddBezier(84, 108, 75, 111, 66, 117, 64, 124)
$meeple.AddBezier(62, 131, 68, 136, 75, 133, 82, 130)
$meeple.AddLine(82, 130, 74, 157)
$meeple.AddBezier(74, 157, 72, 165, 81, 170, 87, 163)
$meeple.AddLine(87, 163, 96, 149)
$meeple.AddLine(96, 149, 105, 163)
$meeple.AddBezier(105, 163, 111, 170, 120, 165, 118, 157)
$meeple.AddLine(118, 157, 110, 130)
$meeple.AddBezier(110, 130, 117, 133, 124, 136, 128, 129)
$meeple.AddBezier(128, 129, 132, 121, 119, 111, 108, 108)
$meeple.CloseFigure()
$graphics.FillPath($whiteBrush, $meeple)

$graphics.Dispose()
$cave.Dispose()
$meeple.Dispose()
$whiteBrush.Dispose()

$finalBitmap = New-Object System.Drawing.Bitmap(
  $size,
  $size,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$finalGraphics = [System.Drawing.Graphics]::FromImage($finalBitmap)
$finalGraphics.Clear([System.Drawing.Color]::Transparent)
$finalGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$finalGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$finalGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$finalGraphics.DrawImage($bitmap, 0, 0, $size, $size)
$finalGraphics.Dispose()
$bitmap.Dispose()

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
$finalBitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
$finalBitmap.Dispose()

Write-Output $resolvedOutput
