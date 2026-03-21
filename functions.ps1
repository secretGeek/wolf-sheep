function list-Functions() {
$p='src/simulation.ts';
$l=Get-Content $p;
$r=@();
for($i=0;$i -lt $l.Length;$i++)
{
	if($l[$i] -match '^\s*(export\s+)?function\s+([A-Za-z0-9_]+)\s*\('){
		$n=$matches[2];
		$s=$i+1;
		$b=0;
		$o=$false;
		$e=$s;
		for($j=$i;$j -lt $l.Length;$j++){
			$c=$l[$j];
			$oc=([regex]::Matches($c,'\{')).Count;
			$cc=([regex]::Matches($c,'\}')).Count;
			if($oc -gt 0){$o=$true};
			if($o){
				$b+=$oc;
				$b-=$cc;
				if($b -eq 0){
					$e=$j+1;break
				}
			}
		};
		$r+=[pscustomobject]@{
			Function=$n;
			LineCount=($e-$s+1);
			grass=($n -like "*grass*");
			wolf=($n -like "*wolf*");
			sheep=($n -like "*sheep*");
			cells=($n -like "*cell*")
		}
	}
};
$r| sort -prop linecount -desc 
}

list-functions | format-table
wh "use `list-Functions` to see functions in src/simulation.ts" -f cyan
