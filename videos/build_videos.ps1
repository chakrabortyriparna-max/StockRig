# Build StockRig launch + founder-letter videos with ffmpeg (no external assets)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

# single-quoted constants only - no interpolation pitfalls
$ARIBLK = 'ariblk.ttf'
$ARIAL  = 'arialbd.ttf'
$INK    = '0x1C1E22'; $PAPER = '0xF7F5F2'; $ORANGE = '0xF25C05'; $STEEL = '0x8A9199'
$W = 1280; $FPS = 30
$script:dyOff = 0

function Scene([string]$name, [int]$dur, [string]$drawtext) {
  $push = ('scale=1472x828,zoompan=z=''1.0+0.06*on/({0}*{1})'':d=1:x=''(iw-iw/zoom)/2'':y=''(ih-ih/zoom)/2'':s={2}x720:fps={0}') -f $FPS, $dur, $W
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i ('color=c={0}:s=1472x828:d={1}:r={2}' -f $INK, $dur, $FPS) `
    -vf "$drawtext,$push" -frames:v ($dur * $FPS) -c:v libx264 -pix_fmt yuv420p ("s_{0}.mp4" -f $name)
}

function T([string]$text, [string]$color, [int]$size, [double]$at) {
  $esc = $text.Replace(':', '\:').Replace(',', '\,').Replace('%', '\%').Replace("'", '')
  return ('drawtext=fontfile={0}:text=''{1}'':fontcolor={2}:fontsize={3}:x=(w-text_w)/2:y=(h-text_h)/2+{4}:alpha=''if(lt(t,{5}),0,min(1,(t-{5})/0.6))''' -f $ARIBLK, $esc, $color, $size, $script:dyOff, $at)
}

# ---------- Launch video ----------
$script:dyOff = -60
$s1a = T 'STOCK' $PAPER 110 0.3
$s1b = ('drawtext=fontfile={0}:text=''RIG'':fontcolor={1}:fontsize=110:x=(w-text_w)/2+250:y=(h-text_h)/2-60:alpha=''if(lt(t,0.7),0,min(1,(t-0.7)/0.6))''' -f $ARIBLK, $ORANGE)
$s1c = ('drawtext=fontfile={0}:text=''KNOW WHAT IS ON THE TRUCK'':fontcolor={1}:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+80:alpha=''if(lt(t,1.4),0,min(1,(t-1.4)/0.8))''' -f $ARIAL, $STEEL)
Scene '1' 4 (($s1a, $s1b, $s1c) -join ',')

$script:dyOff = -70
$s2a = T 'You own 14 thermostats.' $PAPER 62 0.3
$script:dyOff = 20
$s2b = T 'You can find zero.' $ORANGE 78 1.5
Scene '2' 4 (($s2a, $s2b) -join ',')

$script:dyOff = -70
$s3a = T 'Your FSM bills the job.' $PAPER 58 0.3
$script:dyOff = 20
$s3b = T 'It has no idea what is in the van.' $ORANGE 54 1.5
Scene '3' 4 (($s3a, $s3b) -join ',')

$fparts = @(('drawtext=fontfile={0}:text=''THE LOOP'':fontcolor={1}:fontsize=26:x=(w-text_w)/2:y=h/2-260:alpha=''if(lt(t,0.2),0,1)''' -f $ARIBLK, $STEEL))
$steps = @(
  ,@('PAR LEVELS PER VAN', -180, 0.4, $PAPER)
  ,@('PARTS USED ON JOBS', -90, 1.6, $ORANGE)
  ,@('BILLABLE CSV EXPORT', 0, 2.8, $PAPER)
  ,@('RESTOCK LISTS AUTO-BUILT', 90, 4.0, $ORANGE)
)
foreach ($st in $steps) {
  $fparts += ('drawtext=fontfile={0}:text=''{1}'':fontcolor={2}:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2+{3}:alpha=''if(lt(t,{4}),0,min(1,(t-{4})/0.5))''' -f $ARIBLK, $st[0], $st[3], $st[1], $st[2])
}
Scene '4' 6 ($fparts -join ',')

$script:dyOff = -50
$s5a = T 'Free forever.' $PAPER 66 0.4
$script:dyOff = 50
$s5b = T 'Every van accounted for.' $STEEL 44 1.4
Scene '5' 4 (($s5a, $s5b) -join ',')

$script:dyOff = -60
$s6a = T 'STOCKRIG' $PAPER 100 0.3
$script:dyOff = 60
$s6b = T 'stockrig.io' $ORANGE 46 1.0
$script:dyOff = 130
$s6c = T 'Know what is on the truck.' $STEEL 32 1.6
Scene '6' 5 (($s6a, $s6b, $s6c) -join ',')

Write-Output 'launch scenes done'

# ---------- Founder letter video ----------
function LScene([string]$name, [int]$dur, [string]$text, [string]$color, [int]$size, [double]$at) {
  $esc = $text.Replace("'", '').Replace(',', '\,').Replace(':', '\:')
  $cmd = ('drawtext=fontfile={0}:text=''{1}'':fontcolor={2}:fontsize={3}:x=(w-text_w)/2:y=(h-text_h)/2:alpha=''if(lt(t,{4}),0,min(1,(t-{4})/0.9))''' -f $ARIAL, $esc, $color, $size, $at)
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i ('color=c={0}:s=1280x720:d={1}:r={2}' -f $INK, $dur, $FPS) `
    -vf "$cmd" -frames:v ($dur * $FPS) -c:v libx264 -pix_fmt yuv420p ("l_{0}.mp4" -f $name)
}

$L = @(
  ,@('A note from the founding team', 34, $STEEL, 0.3, 5)
  ,@('We kept hearing the same sentence from shop owners:', 40, $PAPER, 0.3, 5.5)
  ,@('It does not manage what is on your trucks very well.', 38, $ORANGE, 0.5, 6)
  ,@('So we built the thing that was missing.', 44, $PAPER, 0.3, 5)
  ,@('Every van tracked. Every part on a job.', 40, $PAPER, 0.4, 5)
  ,@('Every restock list written before Monday.', 40, $PAPER, 1.4, 5.5)
  ,@('No enterprise contract. No per-tech math.', 38, $PAPER, 0.3, 5)
  ,@('Free. That is it.', 52, $ORANGE, 0.5, 5)
  ,@('StockRig. Know what is on the truck.', 36, $STEEL, 0.3, 6)
  ,@('stockrig.io', 52, $PAPER, 0.8, 6)
)

$n = 0
foreach ($line in $L) { LScene ([string]$n) $line[4] $line[0] $line[2] $line[1] $line[3]; $n++ }
Write-Output 'letter scenes done; concatenating...'

$sceneFiles = 1..6 | ForEach-Object { 's_{0}.mp4' -f $_ }
Set-Content -Path 'launch_list.txt' -Value (($sceneFiles | ForEach-Object { "file '$_'" }) -join "`n") -Encoding ASCII
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i launch_list.txt -i launch.wav -c:v copy -c:a aac -shortest launch-video.mp4

$letterFiles = Get-ChildItem l_*.mp4 | Sort-Object { [int]($_.BaseName -replace 'l_','') } | Select-Object -ExpandProperty Name
Set-Content -Path 'letter_list.txt' -Value (($letterFiles | ForEach-Object { "file '$_'" }) -join "`n") -Encoding ASCII
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i letter_list.txt -i letter.wav -c:v copy -c:a aac -shortest founder-letter.mp4

Remove-Item s_*.mp4, l_*.mp4, *_list.txt -ErrorAction SilentlyContinue
Get-ChildItem *.mp4, *.wav | Select-Object Name, Length



